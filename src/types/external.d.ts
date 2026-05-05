declare module '@faker-js/faker' { export const faker: any; }
declare module '@axe-core/playwright' { const AxeBuilder: any; export default AxeBuilder; }
declare module 'pg' { export class Pool { constructor(config?: any); query<T=any>(text: string, params?: any[]): Promise<any>; end(): Promise<void>; } export type QueryResult<T=any> = { rows: T[] }; }
