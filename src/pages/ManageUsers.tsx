import { useEffect, useState } from "react";
import { getBackend } from "../services/backendSelector";
import { useAuth } from "../hooks/AuthContext";
import type { User } from "../interfaces/interfaces";

export const ManageUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const backend = getBackend();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await backend.fetchUsers() as User[];
      setUsers(data);
    } catch (error) {
      console.error("Błąd pobierania użytkowników", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBanToggle = async (targetUser: User) => {
    if (targetUser.id === currentUser?.id) {
        alert("Nie możesz zbanować samego siebie!");
        return;
    }
    
    const newStatus = !targetUser.isBanned;

    try {
        await backend.toggleUserBan(targetUser.id, newStatus);
        
        setUsers(prev => prev.map(u => 
            u.id === targetUser.id ? { ...u, isBanned: newStatus } : u
        ));
    } catch (error) {
        alert("Wystąpił błąd podczas zmiany statusu.");
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch(role) {
        case 'admin': return 'bg-warning text-dark';
        case 'doctor': return 'bg-info text-dark';
        case 'patient': return 'bg-primary';
        default: return 'bg-secondary';
    }
  };

  if (loading) return <div className="p-4 text-center"><div className="spinner-border text-primary"></div></div>;

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Zarządzanie Użytkownikami</h2>
        <span className="badge bg-secondary">{users.length} użytkowników</span>
      </div>
      
      <div className="card shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Email / ID</th>
                <th>Imię i Nazwisko</th>
                <th>Rola</th>
                <th>Status</th>
                <th className="text-end">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className={u.isBanned ? "table-danger bg-opacity-10" : ""}>
                  <td>
                    <div className="fw-bold">{u.email}</div>
                    <small className="text-muted" style={{fontSize: "0.75em"}}>{u.id}</small>
                  </td>

                  <td>
                    {u.firstName} {u.lastName}
                    {u.pesel && <div className="small text-muted">PESEL: {u.pesel}</div>}
                  </td>

                  <td>
                    <span className={`badge ${getRoleBadgeColor(u.role)}`}>
                        {u.role?.toUpperCase()}
                    </span>
                  </td>

                  <td>
                    {u.isBanned ? (
                        <span className="text-danger fw-bold"><i className="bi bi-x-circle"></i> Zbanowany</span>
                    ) : (
                        <span className="text-success fw-bold"><i className="bi bi-check-circle"></i> Aktywny</span>
                    )}
                  </td>

                  <td className="text-end">
                    {u.role === 'patient' && (
                        <button 
                            className={`btn btn-sm ${u.isBanned ? "btn-outline-success" : "btn-outline-danger"}`}
                            onClick={() => handleBanToggle(u)}
                            title={u.isBanned ? "Przywróć dostęp" : "Zablokuj dostęp"}
                        >
                            {u.isBanned ? (
                                <><i className="bi bi-unlock-fill me-1"></i> Odbanuj</>
                            ) : (
                                <><i className="bi bi-lock-fill me-1"></i> Zbanuj</>
                            )}
                        </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};