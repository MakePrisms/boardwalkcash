import { describe, expect, it, mock } from 'bun:test';
import { renderHook } from '@testing-library/react-hooks';
import { act } from 'react';
import { useAnimatedQRDecoder } from './use-animated-qr-decoder';
import { useAnimatedQREncoder } from './use-animated-qr-encoder';

describe('useAnimatedQREncoder', () => {
  it('should handle short text without encoder', () => {
    const { result } = renderHook(() =>
      useAnimatedQREncoder({ text: 'short text', intervalMs: 100 }),
    );

    expect(result.current.isReady).toBe(true);
    expect(result.current.fragment).toMatchSnapshot();
  });

  it('should initialize encoder for long text', async () => {
    const longText = 'x'.repeat(201);
    const { result } = renderHook(() =>
      useAnimatedQREncoder({ text: longText, intervalMs: 10 }),
    );

    expect(result.current.isReady).toBe(true);
    expect(result.current.fragment).toMatchSnapshot();
  });
});

describe('useAnimatedQRDecoder', () => {
  it('should initialize with empty fragment', () => {
    const onDecode = mock(() => void 0);
    const { result } = renderHook(() =>
      useAnimatedQRDecoder({ fragment: '', onDecode }),
    );

    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBeNull();
    expect(onDecode).not.toHaveBeenCalled();
  });

  it('should handle decoder initialization', async () => {
    const onDecode = mock(() => void 0);
    const { result } = renderHook(() =>
      useAnimatedQRDecoder({
        fragment:
          'ur:bytes/pkhsdycsjkhsehcsishseycsjlhseocsjphseecsjyhseccscxhsencsjyhsemcsihhsetcskshsescsjyceyadtde',
        onDecode,
      }),
    );

    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('should handle invalid fragments', async () => {
    const onDecode = mock(() => void 0);
    const { result } = renderHook(() =>
      useAnimatedQRDecoder({ fragment: 'invalid-fragment', onDecode }),
    );

    expect(result.current.error).toBeTruthy();
    expect(onDecode).not.toHaveBeenCalled();
  });
});

describe('end-to-end encoding and decoding', () => {
  it('should successfully encode and decode text through fragments', async () => {
    const originalText = 'Hello World!';
    const onDecode = mock((text: string) => {
      expect(text).toBe(originalText);
    });

    // Set up encoder
    const { result: encoderResult } = renderHook(() =>
      useAnimatedQREncoder({ text: originalText, intervalMs: 10 }),
    );

    // Set up decoder
    const { result: decoderResult } = renderHook(() =>
      useAnimatedQRDecoder({
        fragment: encoderResult.current.fragment,
        onDecode,
      }),
    );

    expect(decoderResult.current.error).toBeNull();
    expect(onDecode).toHaveBeenCalledTimes(1);
  });

  it('should handle long text encoding and decoding', () => {
    const longText = 'x'.repeat(201);
    const onDecode = mock((text: string) => {
      expect(text).toBe(longText);
    });

    // Set up encoder
    const { result: encoderResult } = renderHook(() =>
      useAnimatedQREncoder({ text: longText, intervalMs: 10 }),
    );

    // Simulate receiving multiple fragments
    const { rerender: decoderRerender } = renderHook(
      ({ fragment }) => useAnimatedQRDecoder({ fragment, onDecode }),
      { initialProps: { fragment: encoderResult.current.fragment } },
    );

    // Get next fragment and pass it to decoder
    act(() => {
      for (let i = 0; i < 10; i++) {
        decoderRerender({ fragment: encoderResult.current.fragment });
      }
    });

    expect(onDecode).toHaveBeenCalledTimes(1);
  });
});
