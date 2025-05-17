import { useEffect, useRef } from "react";

export default function useInterval(callback, delay) {
  console.log("HERE IS USEINTERVAL", delay);
  const savedCallback = useRef();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}