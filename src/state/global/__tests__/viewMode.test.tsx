import { Provider, useAtom } from 'jotai';
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { viewModeAtom } from '../system';

function ViewModeHarness() {
  const [viewMode, setViewMode] = useAtom(viewModeAtom);

  return (
    <>
      <button
        type="button"
        aria-pressed={viewMode === 'grid'}
        onClick={() => setViewMode('grid')}
      >
        Grid view
      </button>
      <button
        type="button"
        aria-pressed={viewMode === 'list'}
        onClick={() => setViewMode('list')}
      >
        List view
      </button>
    </>
  );
}

describe('viewModeAtom', () => {
  it('defaults to grid and persists a list-view selection', async () => {
    const user = userEvent.setup();
    const first = render(
      <Provider>
        <ViewModeHarness />
      </Provider>
    );

    expect(screen.getByRole('button', { name: 'Grid view' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await user.click(screen.getByRole('button', { name: 'List view' }));
    expect(localStorage.getItem('qw-view-mode')).toBe('"list"');
    first.unmount();

    render(
      <Provider>
        <ViewModeHarness />
      </Provider>
    );

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute(
        'aria-pressed',
        'true'
      )
    );
  });
});
