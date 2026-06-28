const fs = require('fs');

const targetFile = 'src/features/complaints/pages/ComplaintsPage.tsx';
let content = fs.readFileSync(targetFile, 'utf8');

// Replace imports and hooks to include useEffect
content = content.replace("import { useState, useMemo } from 'react';", "import { useState, useMemo, useEffect } from 'react';");
content = content.replace(
  "  const { complaints } = useComplaintsStore();",
  `  const { complaints, fetchComplaints } = useComplaintsStore();
  
  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);`
);

fs.writeFileSync(targetFile, content);
