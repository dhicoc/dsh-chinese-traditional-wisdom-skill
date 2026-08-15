import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { BirthProvider, useBirth } from '@/lib/birthContext';
import { resolveTrueSolarTime } from '@/engine-api/trueSolarTime';
import { dispatchTrueSolarTimeIntent } from '@/lib/commandIntents';

function TimeStatus() {
  const { baziTimeStatus } = useBirth();
  return <output>{baziTimeStatus.status}</output>;
}

function renderBirthContext() {
  render(
    <BirthProvider>
      <TimeStatus />
    </BirthProvider>,
  );
}

describe('BirthProvider true solar time boundary', () => {
  it('rejects a resolution whose derived result does not match its location evidence', () => {
    renderBirthContext();

    act(() => {
      dispatchTrueSolarTimeIntent({
        source: 'agent-local',
        resolution: {
          status: 'resolved',
          source: 'agent-verified',
          civilBirth: { year: 1990, month: 6, day: 15, hour: 12, minute: 0, gender: '男', useExactCalendar: true },
          trueSolarBirth: { year: 1990, month: 6, day: 15, hour: 12, minute: 0, gender: '男', useExactCalendar: true },
          location: {
            displayName: '北京市，中国',
            longitude: 116.4074,
            ianaTimeZone: 'Asia/Shanghai',
            utcOffsetMinutes: 480,
            utcOffsetEvidence: 'IANA 时区历史规则核验：当地 UTC+08:00',
          },
          longitudeCorrectionMinutes: 0,
          equationOfTimeMinutes: 0,
          trueSolarCorrectionMinutes: 0,
          crossedDate: false,
          crossedShichen: false,
          crossedZiChu: false,
          evidence: ['IANA 时区历史规则核验：当地 UTC+08:00'],
        },
      });
    });

    expect(screen.getByText('awaiting-agent-verification')).toBeInTheDocument();
  });

  it('accepts a locally resolved result for the current civil birth', () => {
    renderBirthContext();
    const resolution = resolveTrueSolarTime(
      { year: 1990, month: 6, day: 15, hour: 12, minute: 0, gender: '男', useExactCalendar: true },
      {
        displayName: '北京市，中国',
        longitude: 116.4074,
        ianaTimeZone: 'Asia/Shanghai',
        utcOffsetMinutes: 480,
        utcOffsetEvidence: 'IANA 时区历史规则核验：当地 UTC+08:00',
      },
    );

    act(() => {
      dispatchTrueSolarTimeIntent({ source: 'agent-local', resolution });
    });

    expect(screen.getByText('true-solar-verified')).toBeInTheDocument();
  });
});
