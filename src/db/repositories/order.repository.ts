import { DatabaseClient } from '../database.client';
export class OrderRepository { constructor(private readonly db: DatabaseClient) {} public async findByUserId(userId: number){ return this.db.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',[userId]); } }
