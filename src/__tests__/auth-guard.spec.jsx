import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';

// Minimal auth context mock
jest.mock('../design-system', () => ({
  useAuth: () => ({ currentUser: null, loading: false }),
}));

function Dummy() {
  return <div>Private</div>;
}

test('redirects to /login when unauthenticated', () => {
  render(
    <MemoryRouter initialEntries={['/private']}>
      <Routes>
        <Route
          path="/private"
          element={
            <ProtectedRoute>
              <Dummy />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login</div>} />
      </Routes>
    </MemoryRouter>
  );

  expect(screen.getByText('Login')).toBeInTheDocument();
});


