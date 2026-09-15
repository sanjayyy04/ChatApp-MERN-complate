import React, { useContext, useEffect } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";
import { API_URL } from "../api";

const Users = () => {
  const { users, setUsers } = useContext(UserContext);

  async function getUsers() {
    try {
      const response = await axios.get(`${API_URL}/api/users`);
      setUsers(response.data.data);
    } catch (error) {
      console.log("There was an error while fetching the users", error);
    }
  }

  async function handleDelete(id) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this user?",
    );

    if (!confirmDelete) return;

    try {
      const response = await axios.delete(
        `${API_URL}/api/users/${id}`,
      );

      if (response.status === 200) {
        setUsers((prevUsers) => prevUsers.filter((user) => user._id !== id));
      }
    } catch (error) {
      console.log(
        "There was an error while deleting the user",
        error.response?.data || error.message,
      );
    }
  }

  useEffect(() => {
    getUsers();
  }, []);

  return (
    <div className="container mt-5">
      <h1 className="mb-4">Registered Users Data</h1>

      <div className="table-responsive">
        <table className="table table-striped table-hover table-bordered align-middle">
          <thead className="table-dark">
            <tr>
              <th>Username</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td>
                  <a href={`/user/${user._id}`}>{user.userName}</a>
                </td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.phone}</td>
                <td>
                  <button className="btn btn-primary btn-sm me-2">Edit</button>

                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(user._id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;
