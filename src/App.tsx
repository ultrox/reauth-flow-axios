import { useQuery } from '@tanstack/react-query';
import { api, authComplete } from './lib/reauth';

const useSwapi = (id: string) => {
  return useQuery({
    queryKey: ['swapi', 'people', id],
    queryFn: async () => {
      const res = await api.get(`/people/${id}`);
      return res.data; // 👈 return data only
    },
  });
};

export default function App() {
  const {
    data: person1,
    error: person1Error,
    status: person1Status,
  } = useSwapi('1');
  const {
    data: person2,
    error: person2Error,
    status: person2Status,
  } = useSwapi('2');

  if (person1Status === 'pending' || person2Status === 'pending') {
    return <button onClick={authComplete}>Retry</button>;
  }
  if (person1Error || person2Error) {
    return (
      <div>
        <pre>{JSON.stringify(person1Error, null, 2)}</pre>;
      </div>
    );
  }
  return (
    <div>
      <details>
        <pre>{JSON.stringify(person1, null, 2)}</pre>
      </details>
      <details>
        <pre>{JSON.stringify(person2, null, 2)}</pre>
      </details>
    </div>
  );
}
