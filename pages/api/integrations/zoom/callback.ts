import type {NextApiRequest, NextApiResponse} from 'next';
import {getSession} from "next-auth/client";
import prisma from "../../../../lib/prisma";

const client_id = process.env.ZOOM_CLIENT_ID;
const client_secret = process.env.ZOOM_CLIENT_SECRET;

const scopes = ['meeting:write:admin', 'meeting:write', 'meeting:read:admin', 'meeting:read'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { code } = req.query;

    // Check that user is authenticated
    const session = await getSession({req: req});

    if (!session) { res.status(401).json({message: 'You must be logged in to do this'}); return; }

    const redirectUri = encodeURI(process.env.BASE_URL + '/api/integrations/zoom/callback');
    const authUrl = 'https://zoom.us/oauth/authorize?response_type=code&client_id=' + client_id + '&redirect_uri=' + redirectUri;
    const authHeader = 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64');

    return new Promise( async (resolve, reject) => {
      const result = await fetch('https://zoom.us/oauth/token?grant_type=authorization_code&code=' + code + '&redirect_uri=' + redirectUri, {
          method: 'POST',
          headers: {
              Authorization: authHeader
          }
      })
        .then(res => res.json());

      const credential = await prisma.credential.create({
        data: {
          type: 'zoom',
          key: result.access_token,
          userId: session.user.id
        }
      });

      res.redirect('/integrations');
      resolve();
    });
}