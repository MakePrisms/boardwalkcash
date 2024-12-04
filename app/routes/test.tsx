import { Link } from '@remix-run/react';
import { Text } from 'tamagui';
import { TealHeading } from '~/components';

export default function Test() {
  return (
    <div>
      <div>Hey you</div>
      <br />
      <Link to="/">Home</Link>
      <br />
      <Text tag="h1" fontSize={23} color="darkcyan">
        Testing heading
      </Text>
      <TealHeading>it was only a fantasy</TealHeading>
    </div>
  );
}
