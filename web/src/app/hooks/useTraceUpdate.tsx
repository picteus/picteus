import { useEffect, useRef } from "react";


export default function useTraceUpdate(name: string, props: object) {
  const previous = useRef(props);
  useEffect(() => {
    const changedProps = Object.entries(props).reduce((currentProps, [key, value]) => {
      if (previous.current[key] !== value)
      {
        currentProps[key] = [previous.current[key], value];
      }
      return currentProps;
    }, {});
    if (Object.keys(changedProps).length > 0) {
      console.log(`${name} props changed:`, changedProps);
    }
    previous.current = props;
  });
}
