const items = arr.filter(Boolean);  // hides null/undefined
expect(items.length).toBe(3);
