// src/mocks/handlers.ts
import { http, HttpResponse, passthrough } from 'msw';

export const handlers = [
  // Specific first
  http.get('https://api.example.com/user', () => {
    return HttpResponse.json({
      id: 'abc-123',
      firstName: 'John',
      lastName: 'Maverick',
    });
  }),

  http.get('*/api/people/:id', (request) => {
    const isValidCookie = request.cookies['session'] === 'ok';

    if (isValidCookie) {
      return passthrough(); // let the real request go
    }
    return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }),
  // match any host + /api/people/:id
  http.get('*/api/people/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: 'Marko',
    });
  }),

  // Wildcard last (optional)
  http.get('*', () => {
    return passthrough();
  }),
];
