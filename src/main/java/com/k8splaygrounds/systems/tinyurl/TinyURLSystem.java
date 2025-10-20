package com.k8splaygrounds.systems.tinyurl;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * TinyURL System Implementation
 * 
 * A comprehensive URL shortening service with features:
 * - URL shortening and resolution
 * - Custom short codes
 * - Expiration handling
 * - Analytics and statistics
 * - Bulk operations
 * - Thread-safe operations
 */
public class TinyURLSystem {
    
    private final ConcurrentHashMap<String, UrlEntry> urlStorage;
    private final AtomicLong urlCounter;
    private static final String BASE_URL = "https://short.ly/";
    private static final String CHARACTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int DEFAULT_EXPIRATION_DAYS = 30;
    
    public TinyURLSystem() {
        this.urlStorage = new ConcurrentHashMap<>();
        this.urlCounter = new AtomicLong(0);
    }
    
    /**
     * Shorten a URL with default expiration
     */
    public String shortenUrl(String originalUrl) {
        return shortenUrl(originalUrl, null, LocalDateTime.now().plusDays(DEFAULT_EXPIRATION_DAYS));
    }
    
    /**
     * Shorten a URL with custom short code
     */
    public String shortenUrl(String originalUrl, String customCode) {
        return shortenUrl(originalUrl, customCode, LocalDateTime.now().plusDays(DEFAULT_EXPIRATION_DAYS));
    }
    
    /**
     * Shorten a URL with custom expiration
     */
    public String shortenUrl(String originalUrl, String customCode, LocalDateTime expiration) {
        validateUrl(originalUrl);
        
        String shortCode = customCode != null ? customCode : generateShortCode();
        
        if (urlStorage.containsKey(shortCode)) {
            throw new IllegalArgumentException("Short code already exists: " + shortCode);
        }
        
        UrlEntry entry = new UrlEntry(originalUrl, shortCode, LocalDateTime.now(), expiration);
        urlStorage.put(shortCode, entry);
        
        return shortCode;
    }
    
    /**
     * Resolve a short URL to original URL
     */
    public Optional<String> resolveUrl(String shortCode) {
        if (shortCode == null || shortCode.trim().isEmpty()) {
            return Optional.empty();
        }
        
        UrlEntry entry = urlStorage.get(shortCode);
        if (entry == null) {
            return Optional.empty();
        }
        
        if (entry.isExpired()) {
            urlStorage.remove(shortCode);
            return Optional.empty();
        }
        
        entry.incrementAccessCount();
        entry.setLastAccessedAt(LocalDateTime.now());
        
        return Optional.of(entry.getOriginalUrl());
    }
    
    /**
     * Shorten multiple URLs
     */
    public List<String> shortenUrls(List<String> urls) {
        List<String> shortUrls = new ArrayList<>();
        for (String url : urls) {
            try {
                String shortUrl = shortenUrl(url);
                shortUrls.add(shortUrl);
            } catch (Exception e) {
                // Log error but continue with other URLs
                System.err.println("Failed to shorten URL: " + url + ", Error: " + e.getMessage());
            }
        }
        return shortUrls;
    }
    
    /**
     * Resolve multiple URLs
     */
    public List<Optional<String>> resolveUrls(List<String> shortCodes) {
        List<Optional<String>> resolvedUrls = new ArrayList<>();
        for (String shortCode : shortCodes) {
            resolvedUrls.add(resolveUrl(shortCode));
        }
        return resolvedUrls;
    }
    
    /**
     * Get URL statistics
     */
    public UrlStats getUrlStats(String shortCode) {
        UrlEntry entry = urlStorage.get(shortCode);
        if (entry == null) {
            return null;
        }
        
        return new UrlStats(
            entry.getAccessCount(),
            entry.getCreatedAt(),
            entry.getLastAccessedAt(),
            entry.getExpiresAt()
        );
    }
    
    /**
     * Clean up expired URLs
     */
    public void cleanupExpiredUrls() {
        urlStorage.entrySet().removeIf(entry -> entry.getValue().isExpired());
    }
    
    /**
     * Generate a unique short code
     */
    private String generateShortCode() {
        long id = urlCounter.incrementAndGet();
        StringBuilder shortCode = new StringBuilder();
        
        while (id > 0) {
            shortCode.append(CHARACTERS.charAt((int) (id % CHARACTERS.length())));
            id /= CHARACTERS.length();
        }
        
        return shortCode.reverse().toString();
    }
    
    /**
     * Validate URL format
     */
    private void validateUrl(String url) {
        if (url == null || url.trim().isEmpty()) {
            throw new IllegalArgumentException("URL cannot be null or empty");
        }
        
        try {
            new java.net.URL(url);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid URL format: " + url);
        }
    }
    
    /**
     * URL Entry class
     */
    public static class UrlEntry {
        private final String originalUrl;
        private final String shortCode;
        private final LocalDateTime createdAt;
        private final LocalDateTime expiresAt;
        private int accessCount;
        private LocalDateTime lastAccessedAt;
        
        public UrlEntry(String originalUrl, String shortCode, LocalDateTime createdAt, LocalDateTime expiresAt) {
            this.originalUrl = originalUrl;
            this.shortCode = shortCode;
            this.createdAt = createdAt;
            this.expiresAt = expiresAt;
            this.accessCount = 0;
            this.lastAccessedAt = null;
        }
        
        public boolean isExpired() {
            return LocalDateTime.now().isAfter(expiresAt);
        }
        
        public void incrementAccessCount() {
            this.accessCount++;
        }
        
        // Getters
        public String getOriginalUrl() { return originalUrl; }
        public String getShortCode() { return shortCode; }
        public LocalDateTime getCreatedAt() { return createdAt; }
        public LocalDateTime getExpiresAt() { return expiresAt; }
        public int getAccessCount() { return accessCount; }
        public LocalDateTime getLastAccessedAt() { return lastAccessedAt; }
        
        public void setLastAccessedAt(LocalDateTime lastAccessedAt) {
            this.lastAccessedAt = lastAccessedAt;
        }
    }
    
    /**
     * URL Statistics class
     */
    public static class UrlStats {
        private final int accessCount;
        private final LocalDateTime createdAt;
        private final LocalDateTime lastAccessedAt;
        private final LocalDateTime expiresAt;
        
        public UrlStats(int accessCount, LocalDateTime createdAt, LocalDateTime lastAccessedAt, LocalDateTime expiresAt) {
            this.accessCount = accessCount;
            this.createdAt = createdAt;
            this.lastAccessedAt = lastAccessedAt;
            this.expiresAt = expiresAt;
        }
        
        // Getters
        public int getAccessCount() { return accessCount; }
        public LocalDateTime getCreatedAt() { return createdAt; }
        public LocalDateTime getLastAccessedAt() { return lastAccessedAt; }
        public LocalDateTime getExpiresAt() { return expiresAt; }
    }
}
