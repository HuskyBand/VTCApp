import UserManager from '@client/stores/UserManager';
import { PermFlags, type User } from '@api/user/User';
import React from 'react';
import { useNavigate } from 'react-router';

const permissionLabel = (flags: number) => {
    const level = flags & PermFlags.LevelMask;
    if (level === PermFlags.IsDirector) return 'Director';
    if (level === PermFlags.IsLeadership || level === PermFlags.IsAssistant) return 'Elevated';
    return 'Band Member';
};

// IsAssistant is a legacy value: existing users at that raw permFlags value still
// read as Elevated, but this page only ever writes IsLeadership going forward.
const normalizedLevel = (flags: number) => {
    const level = flags & PermFlags.LevelMask;
    return level === PermFlags.IsAssistant ? PermFlags.IsLeadership : level;
};

export default function PermissionManagementPage() {
    const nav = useNavigate();
    const [users, setUsers] = React.useState<User[]>([]);
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        if (!UserManager.isLoggedIn || !UserManager.isDirector) {
            nav('/');
            return;
        }

        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const data = await UserManager.getAllUsers();
            setUsers(data);
        } catch (err) {
            setError('Unable to load users.');
        }
    };

    const updatePermission = async (userId: number, permFlags: number) => {
        try {
            await UserManager.updateUserPermissions(userId, permFlags);
            await loadUsers();
        } catch (err) {
            setError('Unable to update permission.');
        }
    };

    return (
        <>
            <h1>Permission Management</h1>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Username</th>
                        <th>Instrument</th>
                        <th>Permission</th>
                        <th>Change</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <tr key={user.id}>
                            <td>{user.firstName} {user.lastName}</td>
                            <td>{user.username}</td>
                            <td>{user.instrument}</td>
                            <td>{permissionLabel(user.permFlags)}</td>
                            <td>
                                <select
                                    value={normalizedLevel(user.permFlags)}
                                    onChange={(event) => updatePermission(user.id!, parseInt(event.target.value))}
                                >
                                    <option value={PermFlags.IsBandMember}>Band Member</option>
                                    <option value={PermFlags.IsLeadership}>Elevated</option>
                                    <option value={PermFlags.IsDirector}>Director</option>
                                </select>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    );
}
