import express, { Request, Response } from 'express';
import { pool } from '../src/db/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const app = express();
const port = 3000;

const secret = 'backend-Login-2024';



const authenticateToken = (req: RequestWithToken, res: Response, next: () => void) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // รับ token จาก header

    if (token == null) return res.sendStatus(401); // ถ้าไม่มี token ส่งกลับ 401 Unauthorized

    jwt.verify(token, secret, (err, user) => {
        if (err) return res.sendStatus(403); // ถ้า token ไม่ถูกต้อง ส่งกลับ 403 Forbidden

        req.token = user as { id: string; email: string; name: string; user_group: string; branch: string; role_id: string };
        next();
    });
};

app.use(authenticateToken);



interface RequestWithToken extends Request {
    token?: {
        id: string;
        email: string;
        name: string;
        user_group: string;
        branch: string;
        role_id: string;
    };
}

app.use(express.json()); 

app.post('/register', async (req: RequestWithToken, res: Response) => {
    try {
        const { email, name, user_group, branch, role_id } = req.body;

        if (!email || !name || !user_group || !branch || !role_id) {
            return res.status(400).send('Missing required fields');
        }

        const checkEmail = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (checkEmail.rows.length > 0) {
            return res.status(400).send('Email is already registered');
        }

        const roleResult = await pool.query('SELECT id FROM roles WHERE id = $1', [role_id]);
        if (roleResult.rows.length === 0) {
            return res.status(400).send('Invalid role');
        }

        const result = await pool.query(
            `INSERT INTO users (email, name, user_group, branch, role_id, createdAt, updatedAt)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *`,
            [email, name, user_group, branch, role_id]
        );

        res.status(201).json({ user: result.rows[0] });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).send('Internal Server Error');
    }
});


app.post('/roles',async (req:RequestWithToken,res:Response)=>{
    try {
        const result = await pool.query(`INSERT INTO roles (role_name) VALUES ($1) RETURNING *`,[req.body.role_name])
        res.status(200).send('INSERT COMPLETE')
    } catch (error) {
        res.status(500).send(error)
    }
})

app.post('/login', async (req: RequestWithToken, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).send('Missing email');
        }

    
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(401).send('Invalid email');
        }

        const user = userResult.rows[0];

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                name: user.name,
                user_group: user.user_group,
                branch: user.branch,
                role_id: user.role_id
            },
            secret,
            { expiresIn: '1h' }
        );

        res.status(200).json({ token });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/moodTracker', async (req: RequestWithToken, res: Response) => {
    try {
        const { mood, content } = req.body;

        if (!mood || !content) {
            return res.status(400).send('Missing required fields');
        }

        await pool.query(
            `INSERT INTO moodtracker (user_id, mood, content) VALUES ($1, $2, $3)`,
            [req.token?.id, mood, content]
        );

        
        const words = content.split(/[\s,]+/);
        for (const word of words) {
            const trimmedWord = word.trim().toLowerCase();
            if (trimmedWord) { 
                await pool.query(
                    `INSERT INTO wordclound (word, count)
                     VALUES ($1, 1)
                     ON CONFLICT (word)
                     DO UPDATE SET count = wordclound.count + 1`,
                    [trimmedWord]
                );
            }
        }

        res.status(200).send('POST COMPLETE');
    } catch (error) {
        console.error('Error in /moodTracker:', error);
        res.status(500).send('Internal Server Error');
    }
});




app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
