// Admin Dashboard Logic

const checkAuth = () => {
    const role = sessionStorage.getItem("userRole");
    if (role !== "premium") {
        window.location.href = "index.html";
    }
};

const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const fetchStats = async () => {
    try {
        const res = await fetch('/api/admin/stats');
        const data = await res.json();
        if (data.success) {
            document.getElementById('count-total').innerText = data.stats.totalUsers;
            document.getElementById('count-normal').innerText = data.stats.roles.normal;
            document.getElementById('count-power').innerText = data.stats.roles.power;
            document.getElementById('count-admin').innerText = data.stats.roles.premium;

            const used = data.stats.storage.used;
            const limit = data.stats.storage.limit;
            const free = data.stats.storage.free;

            document.getElementById('storage-used').innerText = formatBytes(used);
            document.getElementById('storage-free').innerText = `FREE: ${formatBytes(free)}`;

            const percent = (used / limit) * 100;
            document.getElementById('storage-bar').style.width = `${percent}%`;
        }
    } catch (err) {
        console.error("Error fetching stats:", err);
    }
};

const fetchUsers = async () => {
    try {
        const res = await fetch('/api/admin/users');
        const data = await res.json();
        if (data.success) {
            const list = document.getElementById('user-list');
            list.innerHTML = '';
            data.users.forEach(user => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${user.userId}</td>
                    <td>${user.email}</td>
                    <td><span class="role-badge" style="color: ${getRoleColor(user.role)}">${user.role.toUpperCase()}</span></td>
                    <td>${formatBytes(user.storageUsed)}</td>
                    <td class="action-btns">
                        <button class="admin-btn" onclick="purgeContent('${user.userId}')">PURGE</button>
                        <button class="admin-btn btn-danger" onclick="deleteUser('${user.userId}')">DELETE</button>
                    </td>
                `;
                list.appendChild(tr);
            });
        }
    } catch (err) {
        console.error("Error fetching users:", err);
    }
};

const getRoleColor = (role) => {
    switch (role) {
        case 'premium': return '#ff3333';
        case 'power': return '#6495ED';
        default: return '#33ff33';
    }
};

window.purgeContent = async (userId) => {
    if (!confirm(`Are you sure you want to PURGE all content for ${userId}? This cannot be undone.`)) return;
    try {
        const res = await fetch(`/api/admin/purge-user-content/${userId}`, { method: 'POST' });
        const data = await res.json();
        alert(data.message);
        refreshData();
    } catch (err) {
        alert("Action failed");
    }
};

window.deleteUser = async (userId) => {
    if (!confirm(`CRITICAL: Are you sure you want to TERMINATE the entity ${userId}? This will wipe everything and delete the account.`)) return;
    try {
        const res = await fetch(`/api/admin/delete-user/${userId}`, { method: 'POST' });
        const data = await res.json();
        alert(data.message);
        refreshData();
    } catch (err) {
        alert("Action failed");
    }
};

window.logout = () => {
    sessionStorage.clear();
    window.location.href = "index.html";
};

const refreshData = () => {
    fetchStats();
    fetchUsers();
};

// Initialize
checkAuth();
refreshData();

// Remove loading overlay
window.onload = () => {
    setTimeout(() => {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 500);
    }, 1000);
};
