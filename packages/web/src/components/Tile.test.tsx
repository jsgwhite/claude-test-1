import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Tile } from './Tile.js';

describe('Tile', () => {
  it('renders the letter', () => {
    render(<Tile letter="A" state="empty" />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('has data-state="correct" for correct feedback', () => {
    const { container } = render(<Tile letter="A" state="correct" />);
    expect(container.firstChild).toHaveAttribute('data-state', 'correct');
  });

  it('has data-state="present" for present feedback', () => {
    const { container } = render(<Tile letter="B" state="present" />);
    expect(container.firstChild).toHaveAttribute('data-state', 'present');
  });

  it('has data-state="absent" for absent feedback', () => {
    const { container } = render(<Tile letter="C" state="absent" />);
    expect(container.firstChild).toHaveAttribute('data-state', 'absent');
  });

  it('has data-state="typing" while being typed', () => {
    const { container } = render(<Tile letter="D" state="typing" />);
    expect(container.firstChild).toHaveAttribute('data-state', 'typing');
  });

  it('has data-state="empty" for an unfilled tile', () => {
    const { container } = render(<Tile letter="" state="empty" />);
    expect(container.firstChild).toHaveAttribute('data-state', 'empty');
  });

  it('applies green class for correct state', () => {
    const { container } = render(<Tile letter="A" state="correct" />);
    expect(container.firstChild).toHaveClass('bg-green-600');
  });

  it('applies yellow class for present state', () => {
    const { container } = render(<Tile letter="A" state="present" />);
    expect(container.firstChild).toHaveClass('bg-yellow-500');
  });

  it('applies gray class for absent state', () => {
    const { container } = render(<Tile letter="A" state="absent" />);
    expect(container.firstChild).toHaveClass('bg-gray-600');
  });

  it('renders empty string when no letter provided', () => {
    const { container } = render(<Tile state="empty" />);
    expect(container.firstChild).toBeInTheDocument();
    expect(container.firstChild?.textContent).toBe('');
  });
});
