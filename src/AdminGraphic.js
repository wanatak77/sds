import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import './AdminGraphics.css';

import { collection, getDocs, query, doc, setDoc, updateDoc } from 'firebase/firestore';

const AdminGraphics = () => {
  const [graphicsStudents, setGraphicsStudents] = useState([]);
  const [softwareStudents, setSoftwareStudents] = useState([]);
  const [androidStudents, setAndroidStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);

        const graphicsSnapshot = await getDocs(query(collection(db, "graphicsStudents")));
        const softwareSnapshot = await getDocs(query(collection(db, "softwareStudents")));
        const androidSnapshot = await getDocs(query(collection(db, "androidStudents")));

        setGraphicsStudents(graphicsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setSoftwareStudents(softwareSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setAndroidStudents(androidSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      } catch (err) {
        setError(err.message);
        console.error("Error fetching students:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  const handleStatusChange = async (studentId, course, newStatus) => {
    try {
      const courseDocRef = doc(db, `${course}Students`, studentId);
      await updateDoc(courseDocRef, { status: newStatus });

      const allStudents = [...graphicsStudents, ...softwareStudents, ...androidStudents];
      const student = allStudents.find(s => s.id === studentId);

      if (student) {
        const userDocRef = doc(db, "users", student.id);
        await setDoc(userDocRef, { status: newStatus }, { merge: true }); // ✅ create if missing
      }

      const updateList = (list) => list.map(s => s.id === studentId ? { ...s, status: newStatus } : s);

      setGraphicsStudents(prev => updateList(prev));
      setSoftwareStudents(prev => updateList(prev));
      setAndroidStudents(prev => updateList(prev));

    } catch (err) {
      setError(err.message);
      console.error(`Error updating student (${newStatus}):`, err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="admin-graphics">
      <div className="admin-content">
        <h2>Student Management</h2>
        {error && <p className="error-message">{error}</p>}

        <div className="admin-tables">
          {[{
            title: "Graphics Design Students",
            students: graphicsStudents,
            course: 'graphics'
          }, {
            title: "Software Development Students",
            students: softwareStudents,
            course: 'software'
          }, {
            title: "Android Development Students",
            students: androidStudents,
            course: 'android'
          }].map(({ title, students, course }) => (
            <div className="content-card" key={course}>
              <h3>{title}</h3>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => (
                    <tr key={student.id}>
                      <td>{student.fullName}</td>
                      <td>{student.email}</td>
                      <td>{student.phoneNumber}</td>
                      <td>{student.status}</td>
                      <td>
                        {student.status === 'pending' && (
                          <>
                            <button onClick={() => handleStatusChange(student.id, course, 'approved')}>Approve</button>
                            <button onClick={() => handleStatusChange(student.id, course, 'rejected')}>Reject</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminGraphics;
