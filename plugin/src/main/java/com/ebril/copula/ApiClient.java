package com.ebril.copula;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HexFormat;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.logging.Logger;

/**
 * Thin HTTP client for the copula plugin contract. All calls are async;
 * callers are expected to hop back to the main thread before touching Bukkit.
 */
public final class ApiClient {

  private final String baseUrl;
  private final String secret;
  private final Logger log;
  private final HttpClient http;

  public ApiClient(String baseUrl, String secret, Logger log) {
    this.baseUrl = baseUrl;
    this.secret = secret;
    this.log = log;
    this.http = HttpClient.newBuilder()
      .connectTimeout(Duration.ofSeconds(10))
      .build();
  }

  public void close() {
    // Java 17 HttpClient has no explicit close; GC handles it.
  }

  public CompletableFuture<Response> verify(String code, UUID mcUuid, String mcUsername) {
    JsonObject body = new JsonObject();
    body.addProperty("code", code);
    body.addProperty("mcUuid", mcUuid.toString());
    body.addProperty("mcUsername", mcUsername);
    return post("/api/minecraft/verify", body.toString());
  }

  public CompletableFuture<Response> fetchMe(UUID mcUuid) {
    return get("/api/minecraft/me/" + mcUuid.toString());
  }

  public CompletableFuture<Response> grant(UUID mcUuid, int points, String reason,
                                           String idempotencyKey, boolean notify) {
    JsonObject body = new JsonObject();
    body.addProperty("mcUuid", mcUuid.toString());
    body.addProperty("points", points);
    body.addProperty("reason", reason);
    body.addProperty("idempotencyKey", idempotencyKey);
    body.addProperty("notify", notify);
    return post("/api/minecraft/grant", body.toString());
  }

  private CompletableFuture<Response> post(String path, String body) {
    String sig = sign(body);
    HttpRequest req = HttpRequest.newBuilder()
      .uri(URI.create(baseUrl + path))
      .timeout(Duration.ofSeconds(20))
      .header("content-type", "application/json")
      .header("x-copula-signature", sig)
      .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
      .build();
    return http.sendAsync(req, HttpResponse.BodyHandlers.ofString())
      .thenApply(Response::from)
      .exceptionally(err -> {
        log.warning("copula POST " + path + " failed: " + err.getMessage());
        return Response.networkError();
      });
  }

  private CompletableFuture<Response> get(String path) {
    String sig = sign("");
    HttpRequest req = HttpRequest.newBuilder()
      .uri(URI.create(baseUrl + path))
      .timeout(Duration.ofSeconds(20))
      .header("x-copula-signature", sig)
      .GET()
      .build();
    return http.sendAsync(req, HttpResponse.BodyHandlers.ofString())
      .thenApply(Response::from)
      .exceptionally(err -> {
        log.warning("copula GET " + path + " failed: " + err.getMessage());
        return Response.networkError();
      });
  }

  private String sign(String body) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      byte[] out = mac.doFinal(body.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(out);
    } catch (Exception e) {
      throw new RuntimeException("failed to sign copula request", e);
    }
  }

  public static final class Response {
    public final int status;
    public final JsonObject body;
    public final boolean networkError;

    private Response(int status, JsonObject body, boolean networkError) {
      this.status = status;
      this.body = body;
      this.networkError = networkError;
    }

    static Response from(HttpResponse<String> r) {
      JsonObject json = null;
      try {
        json = JsonParser.parseString(r.body()).getAsJsonObject();
      } catch (Exception ignored) { }
      return new Response(r.statusCode(), json, false);
    }

    static Response networkError() {
      return new Response(0, null, true);
    }

    public boolean ok() { return status >= 200 && status < 300; }

    public String errorCode() {
      if (body != null && body.has("error")) return body.get("error").getAsString();
      if (networkError) return "network_error";
      return "http_" + status;
    }
  }
}
