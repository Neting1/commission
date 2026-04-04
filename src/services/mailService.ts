import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const sendEmail = async (to: string, subject: string, text: string) => {
  try {
    await addDoc(collection(db, 'mail'), {
      to,
      message: {
        subject,
        text,
      },
    });
    console.log('Email document created successfully');
  } catch (error) {
    console.error('Error creating email document:', error);
  }
};
