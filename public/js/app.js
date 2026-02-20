document.addEventListener('DOMContentLoaded', () => {
    const folderPathInput = document.getElementById('folderPath');
    const loadBtn = document.getElementById('loadBtn');
    const imageGrid = document.getElementById('imageGrid');
    const footerControls = document.getElementById('footerControls');
    const imageCountSpan = document.getElementById('imageCount');
    const renameBtn = document.getElementById('renameBtn');
    const loader = document.getElementById('loader');
    const loaderText = document.getElementById('loaderText');

    const browseBtn = document.getElementById('browseBtn');
    const dirPickerModal = document.getElementById('dirPickerModal');
    const closeModal = document.getElementById('closeModal');
    const dirExplorer = document.getElementById('dirExplorer');
    const currentDirDisplay = document.getElementById('currentDirDisplay');
    const selectDirBtn = document.getElementById('selectDirBtn');

    let currentImages = [];
    let sortable = null;
    let pickerCurrentPath = '';

    const openDirPicker = async (path = '') => {
        dirPickerModal.classList.remove('hidden');
        await navigateTo(path);
    };

    const navigateTo = async (path) => {
        try {
            const response = await fetch(`/api/images/browse?path=${encodeURIComponent(path)}`);
            const data = await response.json();

            if (data.error) throw new Error(data.error);

            pickerCurrentPath = data.currentPath;
            currentDirDisplay.textContent = pickerCurrentPath;
            renderExplorer(data);
        } catch (err) {
            alert('Error browsing: ' + err.message);
        }
    };

    const renderExplorer = (data) => {
        dirExplorer.innerHTML = '';

        // Add parent directory link
        const parentItem = document.createElement('div');
        parentItem.className = 'dir-item parent-dir';
        parentItem.innerHTML = `<span class="dir-icon">📁</span> .. [Parent Directory]`;
        parentItem.onclick = () => navigateTo(data.parentPath);
        dirExplorer.appendChild(parentItem);

        // Add subdirectories
        data.directories.forEach(dir => {
            const item = document.createElement('div');
            item.className = 'dir-item';
            item.innerHTML = `<span class="dir-icon">📁</span> ${dir.name}`;
            item.onclick = () => navigateTo(dir.path);
            dirExplorer.appendChild(item);
        });
    };

    const showLoader = (text = 'Processing...') => {
        loaderText.textContent = text;
        loader.classList.remove('hidden');
    };

    const hideLoader = () => {
        loader.classList.add('hidden');
    };

    const updateIndices = () => {
        const cards = imageGrid.querySelectorAll('.image-card');
        cards.forEach((card, index) => {
            const indexBadge = card.querySelector('.image-index');
            if (indexBadge) indexBadge.textContent = index + 1;
        });
    };

    const loadImages = async () => {
        const folderPath = folderPathInput.value.trim();
        if (!folderPath) {
            alert('Please enter a folder path');
            return;
        }

        showLoader('Fetching images...');
        try {
            const response = await fetch(`/api/images/list?folderPath=${encodeURIComponent(folderPath)}`);
            const data = await response.json();

            if (data.error) throw new Error(data.error);

            currentImages = data;
            renderImages();
        } catch (err) {
            console.error(err);
            alert('Error loading images: ' + err.message);
        } finally {
            hideLoader();
        }
    };

    const renderImages = () => {
        if (currentImages.length === 0) {
            imageGrid.innerHTML = `<div class="empty-state"><p>No images found in this folder</p></div>`;
            footerControls.classList.add('hidden');
            return;
        }

        imageGrid.innerHTML = '';
        currentImages.forEach((img, index) => {
            const card = document.createElement('div');
            card.className = 'image-card';
            card.dataset.path = img.path;
            card.dataset.name = img.name;
            card.dataset.ext = img.ext;

            card.innerHTML = `
                <div class="image-index">${index + 1}</div>
                <img src="/api/images/thumbnail?imagePath=${encodeURIComponent(img.path)}" alt="${img.name}" loading="lazy">
                <div class="image-info">${img.name}</div>
            `;
            imageGrid.appendChild(card);
        });

        imageCountSpan.textContent = currentImages.length;
        footerControls.classList.remove('hidden');

        if (sortable) sortable.destroy();
        sortable = new Sortable(imageGrid, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: () => {
                updateIndices();
            }
        });
    };

    const updateOrder = async () => {
        const cards = Array.from(imageGrid.querySelectorAll('.image-card'));

        const orderedImages = cards.map(card => ({
            name: card.dataset.name,
            path: card.dataset.path,
            ext: card.dataset.ext
        }));

        if (orderedImages.length === 0) return;

        if (!confirm(`This will update the "Last Modified" time for ${orderedImages.length} files to reflect this order. Are you sure?`)) {
            return;
        }

        showLoader('Updating file timestamps...');
        try {
            const response = await fetch('/api/images/update-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    images: orderedImages
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            alert('Success! File timestamps updated. Gallery apps will now show them in this order.');
        } catch (err) {
            console.error(err);
            alert('Error updating order: ' + err.message);
        } finally {
            hideLoader();
        }
    };

    loadBtn.addEventListener('click', loadImages);
    renameBtn.addEventListener('click', updateOrder);

    browseBtn.addEventListener('click', () => openDirPicker(folderPathInput.value));
    closeModal.addEventListener('click', () => dirPickerModal.classList.add('hidden'));
    selectDirBtn.addEventListener('click', () => {
        folderPathInput.value = pickerCurrentPath;
        dirPickerModal.classList.add('hidden');
        loadImages();
    });

    folderPathInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadImages();
    });
});
