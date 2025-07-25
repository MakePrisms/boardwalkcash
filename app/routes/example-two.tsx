import { useState } from 'react';
import { Button } from '~/components/ui/button';

const myPromise = new Promise((reject) => {
  setTimeout(() => {
    reject(new Error('This is really some error but from promise'));
  }, 1000);
});

export default function ExamplePage() {
  const [error, setError] = useState<Error | null>(null);

  if (error) {
    throw error;
  }

  const handleMe = () => {
    throw new Error('This is really some error but from handler');
  };

  const anotherHandler = async () => {
    await myPromise;
  };

  return (
    <div className="p-2">
      This is some example page
      <br />
      <br />
      <Button
        type="button"
        onClick={() => setError(new Error('This is really some error'))}
      >
        Throw error
      </Button>
      <br />
      <br />
      <Button type="button" onClick={handleMe}>
        Throw error from handler
      </Button>
      <br />
      <br />
      <Button type="button" onClick={anotherHandler}>
        Call promise that will reject
      </Button>
    </div>
  );
}
