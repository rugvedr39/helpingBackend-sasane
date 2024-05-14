import express from 'express';
import { User } from '../models/User';
const router = express.Router();


router.get('/user-refarupi/:id', async (req, res) => {
    const { id } = req.params;
    console.log(id);
    const user = await User.findByPk(id);
    if (user) {
        res.status(200).json(user);
    }else{
        res.status(404).json({ message: 'User not found' });
    }
})

export default router;