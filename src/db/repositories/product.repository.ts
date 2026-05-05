import { DatabaseClient } from '../database.client';
export class ProductRepository { constructor(private readonly db: DatabaseClient) {} public async findBySku(sku: string){ return this.db.query('SELECT * FROM products WHERE sku = $1 LIMIT 1',[sku]); } }
