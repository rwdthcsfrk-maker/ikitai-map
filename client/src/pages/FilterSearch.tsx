import { useEffect } from "react";
import { useLocation, useSearch } from "wouter";

export default function FilterSearch() {
  const [, setLocation] = useLocation();
  const search = useSearch();

  useEffect(() => {
    const query = search ? `?${search}` : "";
    setLocation(`/search${query}`);
  }, [search, setLocation]);

  return null;
}
