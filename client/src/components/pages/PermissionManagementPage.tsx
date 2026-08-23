import UserManager from '@client/stores/UserManager';
import PermissionManager from '@client/stores/PermissionManager';
import { PermFlags, type User } from '@api/user/User';
import React from 'react';
import { useNavigate } from 'react-router';

const permissionLabel = (flags: number) => {
    switch (flags & PermFlags.LevelMask) {
        case PermFlags.IsDirector:
            return 'Director';
        case PermFlags.IsAssistant:
            return 'Assistant';
        case PermFlags.IsLeadership:
            return 'Leadership';
        default:
            return 'Band Member';
    }
};

export default function PermissionManagementPage() {
    const nav = useNavigate();
    const [users, setUsers] = React.useState<User[]>([]);
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        if (!UserManager.isLoggedIn || !PermissionManager.canViewAdmin()) {
            nav('/');
            return;
        }

        loadUsers();
    }, [nav]);

    const loadUsers = async () => {
        try {
            const data = await UserManager.getAllUsers();
            setUsers(data);
        } catch {
            setError('Unable to load users.');
        }
    };

    const updatePermission = async (userId: number, permFlags: number) => {
        try {
            await UserManager.updateUserPermissions(userId, permFlags);
            await loadUsers();
        } catch {
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
                                    value={user.permFlags & PermFlags.LevelMask}
                                    onChange={(event) => updatePermission(user.id!, parseInt(event.target.value))}
                                >
                                    <option value={PermFlags.IsBandMember}>Band Member</option>
                                    <option value={PermFlags.IsLeadership}>Leadership</option>
                                    <option value={PermFlags.IsAssistant}>Assistant</option>
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