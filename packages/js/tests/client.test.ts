/**
 * Tests for EmitKit client
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmitKit, RateLimitError, ValidationError, EmitKitError } from '../src';

describe('EmitKit Client', () => {
  let client: EmitKit;

  beforeEach(() => {
    client = new EmitKit('test_key_12345', {
      baseUrl: 'https://api.test.com'
    });
  });

  describe('initialization', () => {
    it('should create client with API key', () => {
      expect(client).toBeInstanceOf(EmitKit);
    });

    it('should use default base URL if not provided', () => {
      const defaultClient = new EmitKit('test_key');
      expect(defaultClient).toBeInstanceOf(EmitKit);
    });
  });

  describe('rate limit tracking', () => {
    it('should return undefined rate limit initially', () => {
      expect(client.rateLimit).toBeUndefined();
    });

    it('should update rate limit after request', async () => {
      // Mock fetch to return rate limit headers
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Map([
          ['X-RateLimit-Limit', '100'],
          ['X-RateLimit-Remaining', '99'],
          ['X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 60)]
        ]),
        json: async () => ({
          success: true,
          data: { id: 'evt_123' },
          requestId: 'req_123'
        })
      });

      const clientWithMock = new EmitKit('test_key', {
        fetch: mockFetch as any
      });

      await clientWithMock.events.create({
        channelName: 'test',
        title: 'Test'
      });

      expect(clientWithMock.rateLimit).toBeDefined();
      expect(clientWithMock.rateLimit?.limit).toBe(100);
      expect(clientWithMock.rateLimit?.remaining).toBe(99);
    });
  });

  describe('error handling', () => {
    it('should throw RateLimitError on 429', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Map([
          ['X-RateLimit-Limit', '100'],
          ['X-RateLimit-Remaining', '0'],
          ['X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 60)]
        ]),
        json: async () => ({
          error: 'Rate limit exceeded',
          requestId: 'req_123'
        })
      });

      const clientWithMock = new EmitKit('test_key', {
        fetch: mockFetch as any
      });

      await expect(
        clientWithMock.events.create({
          channelName: 'test',
          title: 'Test'
        })
      ).rejects.toThrow(RateLimitError);
    });

    it('should throw ValidationError on 400 with details', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Map(),
        json: async () => ({
          error: 'Validation error',
          details: [{ path: ['channelName'], message: 'Required' }],
          requestId: 'req_123'
        })
      });

      const clientWithMock = new EmitKit('test_key', {
        fetch: mockFetch as any
      });

      await expect(
        clientWithMock.events.create({} as any)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw EmitKitError on 401', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Map(),
        json: async () => ({
          error: 'Unauthorized'
        })
      });

      const clientWithMock = new EmitKit('test_key', {
        fetch: mockFetch as any
      });

      await expect(
        clientWithMock.events.create({
          channelName: 'test',
          title: 'Test'
        })
      ).rejects.toThrow(EmitKitError);
    });
  });

  describe('idempotency', () => {
    it('should detect idempotent replays', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Map([
          ['X-Idempotent-Replay', 'true'],
          ['X-RateLimit-Limit', '100'],
          ['X-RateLimit-Remaining', '99'],
          ['X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 60)]
        ]),
        json: async () => ({
          success: true,
          data: { id: 'evt_123' },
          requestId: 'req_123'
        })
      });

      const clientWithMock = new EmitKit('test_key', {
        fetch: mockFetch as any
      });

      const result = await clientWithMock.events.create(
        {
          channelName: 'test',
          title: 'Test'
        },
        { idempotencyKey: 'test-key-123' }
      );

      expect(result.wasReplayed).toBe(true);
    });
  });
});
