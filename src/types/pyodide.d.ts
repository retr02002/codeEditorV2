declare global {
  const pyodide: any;
  interface Window { pyodide?: any; }
}
export {};
