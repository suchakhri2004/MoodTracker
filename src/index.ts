import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { pool } from './db/client'; 

interface RequestWithToken extends Request {
  token?: {
    office365Id: string;
    email: string;
    name: string;
    faculty: string;
    department: string;
    role: string;
  };
}

const app = express();
app.use(express.json());
const jwtSecret = 'Backend-2024'; 

const authenticateJWT = (req: RequestWithToken, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (token) {
    jwt.verify(token, jwtSecret, (err, user) => {
      if (err) {
        return res.status(403).send('Token is invalid');
      }
      req.token = user as RequestWithToken['token'];
      next();
    });
  } else {
    res.status(401).send('Token is missing');
  }
};

const config = {
  auth: {
    clientId: '739bdd0c-f4ae-4720-b32c-5b66caed0b0e',
    authority: 'https://login.microsoftonline.com/d7cbbb08-47a3-4bd7-8347-5018f2744cfb',
    clientSecret: 'YEC8Q~2UWRZhX.yrMZjtttzet_SUr76plK1CcasU',
  },
};

const cca = new ConfidentialClientApplication(config);

app.get('/login', (req: Request, res: Response) => {
  const authCodeUrlParameters = {
    scopes: ['user.read'],
    redirectUri: 'http://localhost:3000/redirect',
  };

  cca.getAuthCodeUrl(authCodeUrlParameters).then((response) => {
    res.redirect(response);
  }).catch((error) => {
    console.log('Error generating auth URL: ', error);
    res.status(500).send('Error in generating auth URL');
  });
});

app.get('/redirect', async (req: Request, res: Response) => {
  const code = req.query.code as string;

  if (!code) {
    return res.status(400).send('Authorization code is missing.');
  }

  const tokenRequest = {
    code: code,
    scopes: ['user.read'],
    redirectUri: 'http://localhost:3000/redirect',
  };

  try {
    const response = await cca.acquireTokenByCode(tokenRequest);

    const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${response.accessToken}`,
      },
    });
    const userInfo = await userInfoResponse.json();

    const office365Id = userInfo.id;
    const email = userInfo.mail || userInfo.userPrincipalName;
    const name = userInfo.displayName;

    let faculty = 'Unknown Faculty';
    if (email && email.length >= 5) { 
      const facultyCode = email.substring(2, 4); 

      switch (facultyCode) {
        case '01':
            faculty = 'เกษตรศาสตร์และทรัพยากรธรรมชาติ';
            break;
        case '02':
            faculty = 'เทคโนโลยีสารสนเทศและการสื่อสาร';
            break;
        case '03':
            faculty = 'นิติศาตร์';
            break;
        case '04':
            faculty = 'พยาบาลศาสตร์';
            break;
        case '05':
            faculty = 'แพทยศาสตร์';
            break;
        case '06':
            faculty = 'เภสัชศาสตร์';
            break;
        case '07':
            faculty = 'บริหารธุรกิจและนิเทศศาสตร์';
            break;
        case '08':
            faculty = 'วิทยาศาสตร์';
            break;
        case '09':
            faculty = 'วิทยาศาสตร์การแพทย์';
            break;
        case '10':
            faculty = 'วิศวกรรมศาสตร์';
            break;
        case '11':
            faculty = 'ศิลปศาสตร์';
            break;
        case '12':
            faculty = 'สภาปัตยกรรมศาสตร์และศิปกรรมศาสตร์';
            break;
        case '13':
            faculty = 'สหเวชศาสตร์';
            break;
        case '14':
            faculty = 'พลังงานและสิ่งแวดล้อม';
            break;
        case '15':
            faculty = 'วิทยาลัยการศึกษาต่อเนื่อง';
            break;
        case '16':
            faculty = 'วิทยาลัยการจัดการ';
            break;
        case '17':
            faculty = 'วิทยาเขตเชียงราย';
            break;
        case '18':
            faculty = 'ศูนย์บริการและสนับสนุนนิสิตพิการ';
            break;
        case '19':
              faculty = 'ทันตแพทย์ศาสตร์';
              break;
        case '20':
              faculty = 'วิทยาลัยการศึกษา';
              break;
        case '21':
              faculty = 'รัฐศาสตร์และสังคมศาสตร์';
              break;
        case '22':
              faculty = 'สาธารณสุขศาสตร์';
              break;
        default:
            faculty = '';
            break;
    }
}

    const firstChar = email.charAt(0);
    let role = 'USER';
    if (!/\d/.test(firstChar)) {
      role = 'VISITOR';
    }

    const department = userInfo.jobTitle || userInfo.officeLocation

    await pool.query(`
      INSERT INTO users (office365_id, email, name, faculty, department, role, accesstoken, createdAt, updatedAt)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, CURRENT_DATE)
      ON CONFLICT (office365_id) 
      DO UPDATE SET accesstoken = EXCLUDED.accesstoken, updatedAt = CURRENT_DATE
    `, [office365Id, email, name, faculty, department, role, response.accessToken]);

    const payload = {
      office365Id,
      email,
      name,
      faculty,
      department,
      role,
    };

    const token = jwt.sign(payload, jwtSecret, { expiresIn: '1h' });

    res.json({ token:token,status:200 });
  } catch (error) {
    res.status(500).send('Error in acquiring token or fetching user info');
  }
});

app.post('/moodTracker',authenticateJWT, async (req: RequestWithToken, res: Response) => {
  try {
    const { mood, content } = req.body;

    if (!mood || !content) {
      return res.status(400).send('Missing required fields');
    }

    await pool.query(
      `INSERT INTO moodtracker (user_id, mood, content) VALUES ($1, $2, $3)`,
      [req.token?.office365Id, mood, content]
    );

    res.status(200).send('POST COMPLETE');
  } catch (error) {
    console.error('Error in /moodTracker:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/MoodUPContent', authenticateJWT, async (req: RequestWithToken, res: Response) => {
  const { date } = req.query;

  let formattedDate;
  if (!date) {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  } else {
    const [day, month, year] = (date as string).split('/').map(Number);
    formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }

  try {
    const result = await pool.query(`
      SELECT content, COUNT(*) AS countContent
      FROM moodtracker
      WHERE DATE(createdAt) = $1
      GROUP BY content
    `, [formattedDate]);

    if (!result.rows.length) {
      res.status(404).send('Not Found');
    } else {
      res.status(200).json(result.rows);
    }
  } catch (error) {
    console.error('Error retrieving mood content data:', error);
    res.status(500).send('Error retrieving mood content data');
  }
});


app.get('/historyMood', authenticateJWT, async (req: RequestWithToken, res: Response) => {
  try {
    const userId = req.token?.office365Id;

    if (!userId) {
      return res.status(401).send('User ID is missing');
    }

    const result = await pool.query(`
      SELECT mood, DATE(createdAt) AS date
      FROM moodtracker
      WHERE user_id = $1
        AND createdAt >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY date DESC
    `, [userId]);

    const groupedData: { [key: string]: string[] } = result.rows.reduce((acc, row) => {
      const date = new Date(row.date as string);
      const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
      const mood = row.mood as string;

      if (!acc[dayOfWeek]) {
        acc[dayOfWeek] = [];
      }

      acc[dayOfWeek].push(mood);

      return acc;
    }, {} as { [key: string]: string[] });

    const today = new Date().getDay();
    const daysOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const sortedResult = Object.keys(groupedData).map(dayOfWeek => {
      const moodCount = groupedData[dayOfWeek].reduce((count, mood) => {
        count[mood] = (count[mood] || 0) + 1;
        return count;
      }, {} as Record<string, number>);

      const sortedMoods = Object.entries(moodCount)
        .sort((a, b) => b[1] - a[1])
        .map(([mood, count]) => ({ mood, count }));

      return {
        dayOfWeek,
        moods: sortedMoods
      };
    }).sort((a, b) => {
      const indexA = daysOrder.indexOf(a.dayOfWeek);
      const indexB = daysOrder.indexOf(b.dayOfWeek);
      const offsetA = (indexA - today + 7) % 7;
      const offsetB = (indexB - today + 7) % 7;
      return offsetA - offsetB;
    });

    res.status(200).json(sortedResult);
  } catch (error) {
    console.error('Error retrieving mood history:', error);
    res.status(500).send('Error retrieving mood history');
  }
});

app.post('/addToFacultyAndDepartment', authenticateJWT, async (req: RequestWithToken, res: Response) => {
  const { office365_id, faculty, department } = req.query;

  if (!office365_id || !faculty || !department) {
    return res.status(400).send('office365_id, faculty, and department are required');
  }

  try {
    const result = await pool.query(`
      UPDATE users
      SET faculty = $1, department = $2, updatedAt = CURRENT_DATE
      WHERE office365_id = $3
      RETURNING *;
    `, [faculty, department, office365_id]);

    if (!result.rows.length) {
      return res.status(404).send('User not found');
    }

    res.status(200).json({ message: 'Faculty and department updated successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Error updating faculty and department:', error);
    res.status(500).send('Error updating faculty and department');
  }
});

app.get('/getTeacher',authenticateJWT, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT office365_id, name, email, faculty, department, role
      FROM users
      WHERE role = 'VISITOR';
    `);

    if (result.rows.length === 0) {
      return res.status(404).send('No visitors found');
    }

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error retrieving visitor data:', error);
    res.status(500).send('Error retrieving visitor data');
  }
});

app.get('/getMoodFromStudent', authenticateJWT, async (req: RequestWithToken, res: Response) => {
  try {
    const { faculty, department } = req.token || {};

    const result = await pool.query(`
      SELECT u.name, u.email, m.mood, m.content, m.createdAt
      FROM users u
      JOIN moodtracker m ON u.office365_id = m.user_id
      WHERE u.faculty = $1 AND u.department = $2 AND DATE(m.createdAt) = CURRENT_DATE;
    `, [faculty, department]);

    if (result.rows.length === 0) {
      return res.status(404).send('No mood data found for the specified faculty and department on the current date');
    }

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error retrieving mood data:', error);
    res.status(500).send('Error retrieving mood data');
  }
});


app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});
