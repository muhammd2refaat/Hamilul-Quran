const fs = require('fs');

const targetFile = 'src/features/allocations/store/allocationsStore.ts';
let content = fs.readFileSync(targetFile, 'utf8');

content = content.replace("import api from '@/shared/api/client';", "import { get, post } from '@/services/api/client';");
content = content.replace("await api.get<Allocation[]>('/allocations');", "await get<Allocation[]>('/allocations');");
content = content.replace("await api.post<Allocation>('/allocations', data);", "await post<Allocation>('/allocations', data);");
content = content.replace("export const useAllocationsStore = create<AllocationsState>((set, get) => ({", "export const useAllocationsStore = create<AllocationsState>((set) => ({");

fs.writeFileSync(targetFile, content);
