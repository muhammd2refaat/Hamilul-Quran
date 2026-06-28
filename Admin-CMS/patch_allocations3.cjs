const fs = require('fs');

// Fix store
let storeFile = 'src/features/allocations/store/allocationsStore.ts';
let storeContent = fs.readFileSync(storeFile, 'utf8');
storeContent = storeContent.replace("set({ allocations: response.data, isLoading: false });", "set({ allocations: response, isLoading: false });");
storeContent = storeContent.replace("allocations: [response.data, ...state.allocations],", "allocations: [response, ...state.allocations],");
fs.writeFileSync(storeFile, storeContent);

// Fix page
let targetFile = 'src/features/allocations/pages/AllocationsPage.tsx';
let content = fs.readFileSync(targetFile, 'utf8');

// The block starts with {s.teacherName && (
// Let's just regex remove it.
content = content.replace(/\{s\.teacherName && \([\s\S]*?\}\)/g, '');
fs.writeFileSync(targetFile, content);
