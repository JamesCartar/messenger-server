const roleModel = require('../models/Role.js');
const userModel = require('../models/User.js');
const pushNotiModel = require('../models/PushNoti.js');
const admin = require('firebase-admin');

const sendNoti = async (req, res, next) => {
    const { title, body, topic, userId } = req.body;
    if(!req.jwt || !title || !body || !topic || !userId) 
        return res.status(400).json({success: false, msg: 'You are not authorize to visite this route or plese provide all the necessity fields !'});

    // const userRole = await roleModel.findOne({role: req.jwt.role});
    // if(!userRole) return res.status(403).json({success: false, msg: 'You are not allowed to visit this route !'});

    try {
        if(true) {
            const message = {
                notification: { title: 'title goes here', body: 'body goes here ssssssssssssssssssssssss' },
                android: {
                  notification: {title: 'title goes here', body: 'body goes here ssssssssssssssssssssssss', imageUrl: 'https://foo.bar.pizza-monster.png' }
                },
                apns: {
                  payload: { aps: { 'mutable-content': 1 } },
                  fcm_options: { image: 'https://foo.bar.pizza-monster.png' }
                },
                webpush: {
                  headers: { image: 'https://foo.bar.pizza-monster.png' }
                },
            };

            
            const messaging = admin.messaging();
            if(topic === 'multi') {
                let tokens = [];
                for(let i = 0; i < userId.length; i ++) {
                    let user = await userModel.findById(userId[i]);
                    let notiData = await pushNotiModel.findById(user.notiData);
                    tokens.push(notiData.token)
                }

                message.tokens = tokens;
                const response = await messaging.sendMulticast(message);
                console.log(response.responses[0].error);
            } else {
                if(topic === 'all') {
                    message.topic = 'all';
                } else {
                    let user = await userModel.findOne({_id: req.body.userId});
                    notiData = await pushNotiModel.findById(user.notiData);
                    message.token = 'fyf9Ez7Z-iv-is2cG5VG9S:APA91bF2Uu-8Tn7-6jh6OudBfW5hqHod0WzplRq6A0SPD6qgpBIjLscxcFMndI-OJ1hbms4SlSkZbijdsRzyx0GVzF5_I3PgbEXnH1BJxYMManqMK5sBJIF4q5YD3kYCSWQ8DTTsC2kU';
                }
                const response = await messaging.send(message);
                console.log(response);
            }
            return res.status(200).json({success: true, msg: 'Notification send successfully !'}); 
        }
        return res.status(400).json({success: false, msg: 'You are not authorize to visite this route !'});  
    } catch (error) {
        return res.status(500).json({ success: false, msg: error.message });
    }
}


module.exports = { sendNoti };