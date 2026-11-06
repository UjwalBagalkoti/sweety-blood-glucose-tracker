import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App.jsx';

vi.mock('./api.js', () => ({
  api: { me: vi.fn().mockRejectedValue(new Error('Not logged in')), login: vi.fn(), register: vi.fn(), logout: vi.fn() }
}));

describe('authentication screen', () => {
  it('shows the login form and can switch to registration', async () => {
    render(<App />);
    expect(await screen.findByText('Good to see you.')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Create an account'));
    expect(screen.getByText('Create your account.')).toBeInTheDocument();
    expect(screen.getByLabelText('Your name')).toBeInTheDocument();
  });
});
