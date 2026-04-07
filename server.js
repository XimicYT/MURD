const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const supabase = createClient('https://qjndcydskxffjrdstxtt.supabase.co', 'YOUR_SUPABASE_SERVICE_ROLE_KEY');

const PLAYERS = {};

io.on('connection', (socket) => {
    console.log('User joined:', socket.id);

    socket.on('join_game', async ({ username, matchId }) => {
        PLAYERS[socket.id] = { id: socket.id, username, x: 100, y: 100, token: 'Scarf' };
        socket.join(matchId);
        io.to(matchId).emit('player_update', PLAYERS);
    });

    socket.on('move', (data) => {
        if (PLAYERS[socket.id]) {
            PLAYERS[socket.id].x = data.x;
            PLAYERS[socket.id].y = data.y;
            socket.broadcast.emit('player_update', PLAYERS);
        }
    });

    // The "Frame" Logic
    socket.on('strike_npc', async ({ matchId, npcId, stolenToken, weapon }) => {
        // 1. Update Panic Meter in Supabase
        const { data } = await supabase.rpc('increment_panic', { match_id: matchId, amount: 30 });
        
        // 2. Log Evidence
        await supabase.from('evidence').insert([{
            match_id: matchId,
            victim_name: 'NPC Staff',
            weapon_used: weapon,
            found_token: stolenToken || 'Phantom'
        }]);

        io.to(matchId).emit('body_reported', { token: stolenToken });
    });

    socket.on('disconnect', () => {
        delete PLAYERS[socket.id];
        io.emit('player_update', PLAYERS);
    });
});

server.listen(process.env.PORT || 3000, () => console.log('Server running...'));