import { DatabaseClient } from '../database.client';
export class CartRepository { constructor(private readonly db: DatabaseClient) {} public async findByUserId(userId: number){ return this.db.query('SELECT * FROM carts WHERE user_id = $1 ORDER BY id DESC LIMIT 1',[userId]); } }
