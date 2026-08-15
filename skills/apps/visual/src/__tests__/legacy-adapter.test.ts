import { describe, expect, it } from 'vitest';
import {
  getLegacyEngineAdapter,
  calculateWithLegacyAdapter,
  renderDataWithLegacyAdapter,
  readingWithLegacyAdapter,
} from '@/legacy/engineAdapters';

describe('legacy engine adapter 桥接（已废弃，始终 null）', () => {
  it('getLegacyEngineAdapter 始终返回 null', () => {
    expect(getLegacyEngineAdapter('bazi')).toBeNull();
  });

  it('calculateWithLegacyAdapter 始终返回 null', () => {
    expect(calculateWithLegacyAdapter('bazi', { year: 1990 })).toBeNull();
    expect(calculateWithLegacyAdapter('nonexistent', {})).toBeNull();
  });

  it('renderDataWithLegacyAdapter 始终返回 null', () => {
    expect(renderDataWithLegacyAdapter('bazi', { result: 'ok' }, { year: 1990 })).toBeNull();
  });

  it('readingWithLegacyAdapter 始终返回 null', () => {
    expect(readingWithLegacyAdapter('bazi', {})).toBeNull();
  });
});
