// 전역 변수
var map, markerGroup, pathGroup, currentSelection;

// 지도 초기화
function initMap() {
    try {
        // Leaflet이 로드되었는지 확인
        if (typeof L === 'undefined') {
            throw new Error('Leaflet 라이브러리를 불러올 수 없습니다.');
        }

        // 데이터가 로드되었는지 확인
        if (typeof journeyData === 'undefined' || typeof bookLocations === 'undefined') {
            throw new Error('지도 데이터를 불러올 수 없습니다.');
        }

        // 지도 컨테이너가 있는지 확인
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            throw new Error('지도 컨테이너를 찾을 수 없습니다.');
        }

        map = L.map('map').setView([31.7683, 35.2137], 6);

        // ESRI 위성 지도
        const tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: '© Esri, Maxar, Earthstar Geographics',
            errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
        });

        tileLayer.on('tileerror', function() {
            console.warn('일부 지도 타일을 불러올 수 없습니다. 인터넷 연결을 확인해주세요.');
        });

        tileLayer.addTo(map);

        markerGroup = L.layerGroup().addTo(map);
        pathGroup = L.layerGroup().addTo(map);

        console.log('지도가 성공적으로 초기화되었습니다.');
    } catch (error) {
        console.error('지도 초기화 오류:', error);
        showErrorMessage('지도를 불러올 수 없습니다: ' + error.message);
    }
}

// 에러 메시지 표시
function showErrorMessage(message) {
    const mapElement = document.getElementById('map');
    if (mapElement) {
        mapElement.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100%; background: #1a1a1a; color: #fff;">
                <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                    <h2 style="color: #d4af37; margin-bottom: 10px;">오류 발생</h2>
                    <p>${message}</p>
                    <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #d4af37; color: #000; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
                        새로고침
                    </button>
                </div>
            </div>
        `;
    }
}

// 마커 생성
function createMarker(location, color) {
    const html = `
        <div class="emoji-marker">
            <div class="emoji-icon">
                ${location.emoji}
                ${location.order ? `<span class="marker-number">${location.order}</span>` : ''}
            </div>
            <div class="emoji-label">${location.name}</div>
        </div>
    `;

    const icon = L.divIcon({
        html: html,
        className: 'custom-marker',
        iconSize: [80, 80],
        iconAnchor: [40, 40]
    });

    const marker = L.marker([location.lat, location.lng], { icon: icon });

    // 팝업 내용 구성
    let eventsHtml = '';
    if (location.events && location.events.length > 0) {
        eventsHtml = `
            <div class="popup-section">
                <h4>📖 주요 성경 사건</h4>
                <ul>
                    ${location.events.map(event => `<li>${event}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    let popupContent = `
        <div class="custom-popup">
            <div class="popup-header">
                <h3>${location.emoji} ${location.name}</h3>
            </div>
            <div class="popup-section">
                <h4>📍 개요</h4>
                <p>${location.description}</p>
            </div>
            ${eventsHtml}
        </div>
    `;

    marker.bindPopup(popupContent, {
        maxWidth: 420,
        className: 'custom-popup-wrapper'
    });

    return marker;
}

// 여정 표시
function showJourney(event, journeyKey) {
    clearMap();
    const journey = journeyData[journeyKey];

    if (!journey) return;

    // 버튼 활성화
    document.querySelectorAll('.journey-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.journey-btn').classList.add('active');

    // 마커 추가
    const latlngs = [];
    const returnLatlngs = [];

    journey.locations.forEach(location => {
        const marker = createMarker(location, journey.color);
        marker.addTo(markerGroup);

        if (location.isReturn) {
            returnLatlngs.push([location.lat, location.lng]);
        } else {
            latlngs.push([location.lat, location.lng]);
        }
    });

    // 경로 그리기
    if (latlngs.length > 1) {
        L.polyline(latlngs, {
            color: journey.color,
            weight: 3,
            opacity: 0.7
        }).addTo(pathGroup);
    }

    // 귀환 경로 그리기 (점선)
    if (returnLatlngs.length > 1) {
        L.polyline(returnLatlngs, {
            color: journey.returnColor || '#FFA500',
            weight: 3,
            opacity: 0.7,
            dashArray: '10, 10'
        }).addTo(pathGroup);
    }

    // 정보 표시
    showSelectionInfo(journey.title, journey.period, journey.locations.length);

    // 지도 범위 조정
    const allLatlngs = [...latlngs, ...returnLatlngs];
    if (allLatlngs.length > 0) {
        map.fitBounds(allLatlngs, { padding: [50, 50] });
    }
}

// 성경책 지명 표시
function showBook(event, bookName) {
    clearMap();
    const book = bookLocations[bookName];

    if (!book) {
        alert('아직 준비 중인 성경책입니다.');
        return;
    }

    // 버튼 활성화
    document.querySelectorAll('.book-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // 마커 추가
    const latlngs = [];
    book.locations.forEach(location => {
        const marker = createMarker(location, book.color);
        marker.addTo(markerGroup);
        latlngs.push([location.lat, location.lng]);
    });

    // 정보 표시
    showSelectionInfo(bookName, book.period, book.locations.length);

    // 지도 범위 조정
    if (latlngs.length > 0) {
        map.fitBounds(latlngs, { padding: [50, 50] });
    }
}

// 선택 정보 표시
function showSelectionInfo(title, period, count) {
    const selectionDiv = document.getElementById('current-selection');
    const descElement = document.getElementById('selection-description');

    selectionDiv.style.display = 'block';
    document.getElementById('selection-title').textContent = title;
    document.getElementById('location-count').textContent = count;
    document.getElementById('period-info').textContent = period || '-';

    // 설명이 있으면 표시, 없으면 숨김
    if (descElement) {
        if (period && period !== '' && period !== '-') {
            descElement.textContent = period;
            descElement.style.display = 'block';
        } else {
            descElement.style.display = 'none';
        }
    }
}

// 지도 초기화
function clearMap() {
    markerGroup.clearLayers();
    pathGroup.clearLayers();
    document.getElementById('current-selection').style.display = 'none';
}

// 전체 위치 표시
function showAllLocations() {
    clearMap();
    let allLocations = [];

    // 모든 여정 위치 추가
    Object.values(journeyData).forEach(journey => {
        journey.locations.forEach(location => {
            const marker = createMarker(location, journey.color);
            marker.addTo(markerGroup);
            allLocations.push([location.lat, location.lng]);
        });
    });

    showSelectionInfo('전체 지명', '모든 시대', allLocations.length);

    if (allLocations.length > 0) {
        map.fitBounds(allLocations, { padding: [50, 50] });
    }
}

// 이스라엘로 줌
function zoomToIsrael() {
    map.setView([31.7683, 35.2137], 8);
}

// 탭 전환
function switchTab(event, tabName) {
    // 모든 탭 콘텐츠 숨기기
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // 모든 탭 버튼 비활성화 및 aria-selected 업데이트
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
    });

    // 선택된 탭 표시
    switch(tabName) {
        case 'journeys':
            document.getElementById('journeys-tab').classList.add('active');
            break;
        case 'old-testament':
            document.getElementById('old-testament-tab').classList.add('active');
            break;
        case 'new-testament':
            document.getElementById('new-testament-tab').classList.add('active');
            break;
        case 'revelation':
            document.getElementById('revelation-tab').classList.add('active');
            break;
    }

    // 해당 탭 버튼 활성화 및 aria-selected 업데이트
    event.target.classList.add('active');
    event.target.setAttribute('aria-selected', 'true');
}

// 검색 기능 및 초기화
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;

    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.trim().toLowerCase();

        // 디바운싱: 입력 후 300ms 대기
        clearTimeout(searchTimeout);

        if (searchTerm.length < 2) {
            if (searchTerm.length === 0) {
                clearMap();
            }
            return;
        }

        searchTimeout = setTimeout(() => {
            performSearch(searchTerm);
        }, 300);
    });

    // 엔터 키로 검색
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            clearTimeout(searchTimeout);
            const searchTerm = e.target.value.trim().toLowerCase();
            if (searchTerm.length >= 2) {
                performSearch(searchTerm);
            }
        }
    });
});

// 검색 실행 함수
function performSearch(searchTerm) {
    clearMap();
    const foundLocations = new Map(); // 중복 제거를 위해 Map 사용
    let searchResults = [];

    // 1. 여정에서 검색
    Object.entries(journeyData).forEach(([journeyKey, journey]) => {
        // 여정 제목에서 검색
        if (journey.title && journey.title.toLowerCase().includes(searchTerm)) {
            journey.locations.forEach(location => {
                const key = `${location.lat}-${location.lng}`;
                if (!foundLocations.has(key)) {
                    foundLocations.set(key, { location, color: journey.color });
                }
            });
        }

        // 지명에서 검색
        journey.locations.forEach(location => {
            if (location.name.toLowerCase().includes(searchTerm) ||
                (location.description && location.description.toLowerCase().includes(searchTerm))) {
                const key = `${location.lat}-${location.lng}`;
                if (!foundLocations.has(key)) {
                    foundLocations.set(key, { location, color: journey.color });
                }
            }
        });
    });

    // 2. 성경책에서 검색
    Object.entries(bookLocations).forEach(([bookName, book]) => {
        // 성경책 이름에서 검색
        if (bookName.toLowerCase().includes(searchTerm)) {
            if (book.locations) {
                book.locations.forEach(location => {
                    const key = `${location.lat}-${location.lng}`;
                    if (!foundLocations.has(key)) {
                        foundLocations.set(key, { location, color: book.color });
                    }
                });
            }
        }

        // 지명에서 검색
        if (book.locations) {
            book.locations.forEach(location => {
                if (location.name.toLowerCase().includes(searchTerm) ||
                    (location.description && location.description.toLowerCase().includes(searchTerm))) {
                    const key = `${location.lat}-${location.lng}`;
                    if (!foundLocations.has(key)) {
                        foundLocations.set(key, { location, color: book.color });
                    }
                }
            });
        }
    });

    // 3. 마커 표시
    const coordsList = [];
    foundLocations.forEach(({ location, color }) => {
        const marker = createMarker(location, color);
        marker.addTo(markerGroup);
        coordsList.push([location.lat, location.lng]);
        searchResults.push(location.name);
    });

    // 4. 결과 표시
    if (coordsList.length > 0) {
        showSelectionInfo(
            `'${searchTerm}' 검색 결과`,
            `${searchResults.slice(0, 5).join(', ')}${searchResults.length > 5 ? '...' : ''}`,
            coordsList.length
        );
        map.fitBounds(coordsList, { padding: [50, 50] });
    } else {
        showSelectionInfo(
            `'${searchTerm}' 검색 결과`,
            '검색 결과가 없습니다',
            0
        );
    }
}

// ========== 토글 및 드래그 기능 ==========

// 패널 토글 기능
const togglePanel = document.getElementById('togglePanel');
const controlPanel = document.getElementById('controlPanel');

togglePanel.addEventListener('click', function() {
    controlPanel.classList.toggle('collapsed');

    // 로컬 스토리지에 상태 저장
    const isCollapsed = controlPanel.classList.contains('collapsed');
    localStorage.setItem('panelCollapsed', isCollapsed);
});

// CSS 위치를 절대 좌표로 변환 (드래그 전에 호출)
function convertToAbsolutePosition(element) {
    const rect = element.getBoundingClientRect();
    element.style.top = rect.top + 'px';
    element.style.left = rect.left + 'px';
    element.style.right = 'auto';
    element.style.bottom = 'auto';
}

// 드래그 기능
function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    let header = element.querySelector('.panel-header');

    if (header) {
        header.onmousedown = dragMouseDown;
        header.ontouchstart = dragTouchStart;
    }

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();

        // 드래그 시작 시 위치를 절대 좌표로 변환
        convertToAbsolutePosition(element);

        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
        element.classList.add('dragging');
    }

    function dragTouchStart(e) {
        e.preventDefault();

        // 드래그 시작 시 위치를 절대 좌표로 변환
        convertToAbsolutePosition(element);

        const touch = e.touches[0];
        pos3 = touch.clientX;
        pos4 = touch.clientY;
        document.ontouchend = closeDragElement;
        document.ontouchmove = elementTouchDrag;
        element.classList.add('dragging');
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        let newTop = element.offsetTop - pos2;
        let newLeft = element.offsetLeft - pos1;

        // 화면 경계 체크
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - element.offsetHeight));
        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - element.offsetWidth));

        element.style.top = newTop + "px";
        element.style.left = newLeft + "px";
        element.style.right = "auto";
        element.style.bottom = "auto";

        // 위치 저장
        savePosition(element);
    }

    function elementTouchDrag(e) {
        e.preventDefault();
        const touch = e.touches[0];
        pos1 = pos3 - touch.clientX;
        pos2 = pos4 - touch.clientY;
        pos3 = touch.clientX;
        pos4 = touch.clientY;

        let newTop = element.offsetTop - pos2;
        let newLeft = element.offsetLeft - pos1;

        // 화면 경계 체크
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - element.offsetHeight));
        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - element.offsetWidth));

        element.style.top = newTop + "px";
        element.style.left = newLeft + "px";
        element.style.right = "auto";
        element.style.bottom = "auto";

        // 위치 저장
        savePosition(element);
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        document.ontouchend = null;
        document.ontouchmove = null;
        element.classList.remove('dragging');
    }

    function savePosition(elem) {
        const id = elem.id;
        const position = {
            top: elem.style.top,
            left: elem.style.left
        };
        localStorage.setItem(`${id}Position`, JSON.stringify(position));
    }
}

// 위치 복원 함수
function restorePosition(element) {
    const id = element.id;
    const savedPosition = localStorage.getItem(`${id}Position`);

    if (savedPosition) {
        const position = JSON.parse(savedPosition);
        element.style.top = position.top;
        element.style.left = position.left;
        element.style.right = "auto";
        element.style.bottom = "auto";
    } else {
        // 저장된 위치가 없으면 기본 위치 설정
        if (id === 'controlPanel') {
            // 패널은 왼쪽 위 (이미 CSS에 설정되어 있음)
            element.style.top = '20px';
            element.style.left = '20px';
            element.style.bottom = 'auto';
            element.style.right = 'auto';
        }
    }
}

// 상태 복원 함수
function restoreState() {
    // 패널 상태 복원
    const panelCollapsed = localStorage.getItem('panelCollapsed');
    if (panelCollapsed === 'true') {
        controlPanel.classList.add('collapsed');
    }

    // 위치 복원
    restorePosition(controlPanel);
}

// 모바일 감지 및 기본 접힌 상태
function checkMobile() {
    if (window.innerWidth <= 768) {
        const panelCollapsed = localStorage.getItem('panelCollapsed');
        // 로컬 스토리지에 설정이 없으면 모바일에서는 기본 접힌 상태
        if (panelCollapsed === null) {
            controlPanel.classList.add('collapsed');
        }
    }
}

// 페이지 로드 시 지도 초기화 및 UI 설정
window.onload = function() {
    initMap();

    // 드래그 가능하게 만들기
    makeDraggable(controlPanel);

    // 상태 복원
    restoreState();

    // 모바일 체크
    checkMobile();
};

// 윈도우 리사이즈 시 모바일 체크
window.addEventListener('resize', checkMobile);