import { DatabaseClient } from '../database.client';
export class UserRepository { constructor(private readonly db: DatabaseClient) {} public async findByEmail(email: string){ return this.db.query('SELECT * FROM users WHERE email = $1 LIMIT 1',[email]); } }
