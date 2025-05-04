
var isImagery = true; // 当前是否为影像图
var imageryLayer = L.tileLayer('https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}')
var streetLayer = L.tileLayer('https://services.arcgisonline.com/arcgis/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}')
// 初始化地图
var map = L.map('map', {
    // crs: L.CRS.EPSG4326, 
    zoomControl: false,
    minZoom: 4,
}).setView([36, 105], 4); // 设置初始中心点和缩放级别
streetLayer.addTo(map); // 添加影像图层
var indexData=null; // 用于存储索引数据
var selectDay=""; // 用于存储选择的日期
var selectType="type-o3"; // 用于存储选择的类型
const imageBounds = [[54.0, 72.0], [11.5, 135.5]]; // 图片覆盖范围
var currentOverlay; // 用于存储当前的图片覆盖层

/***********************************事件定义********************************************/
// 全图范围事件
document.getElementById('reset-view').addEventListener('click', function () {
    map.setView([34, 105], 4)
});
// 底图切换事件
document.getElementById('toggle-basemap').addEventListener('click', function () {
    if (isImagery) {
        map.removeLayer(imageryLayer);
        streetLayer.addTo(map);
    } else {
        map.removeLayer(streetLayer);
        imageryLayer.addTo(map);
    }
    isImagery = !isImagery; // 切换状态
});
// 气体类型切换事件
function changeGasType(event) {
    document.getElementById('type-o3').className='type-button'
    document.getElementById('type-pm2.5').className='type-button'
    document.getElementById('type-no2').className='type-button'
    event.target.classList.add('selected')
    selectType=event.target.id; // 获取用户选择的气体类型
    loadData()
}
document.getElementById('type-o3').addEventListener('click', changeGasType);
document.getElementById('type-pm2.5').addEventListener('click', changeGasType);
document.getElementById('type-no2').addEventListener('click', changeGasType);

// 监听日期选择框的变化
document.getElementById('date-picker').addEventListener('change', function (event) {
    const selectedDate = event.target.value; // 获取用户选择的日期

    // 根据选择的日期执行相应逻辑
    if (selectedDate ) {
        selectDay=selectedDate.replace(/-/g, '');; // 更新选择的日期
        if (selectDay in indexData) {
            loadData(selectDay); // 重新加载数据
        }else{
            alert('数据不存在，请选择其他日期！'); 
        }
    }
});
// 滑动条切换事件
document.getElementById('timeline-slider').addEventListener('input', function () {
    const slider = document.getElementById('timeline-slider');
    const label = document.getElementById('timestamp');
    const index = parseInt(slider.value, 10);
    const dayhour = selectDay+indexData[selectDay][index];
    label.innerHTML = `${dayhour.slice(0,4)}-${dayhour.slice(4,6)}-${dayhour.slice(6,8)} ${dayhour.slice(-2)}:00`;
    updateImageOverlay(dayhour); // 更新地图图片
});

/*
 * 加载json数据
 */
function loadData(dayStr) {
    // 根据气体类型确定json路径
    let index_url=""
    if(selectType=="type-pm2.5"){
        index_url="./PM25/data/sta/index.json"
    }else if(selectType=="type-no2"){
        index_url="./NO2/data/sta/index.json"
    }else{
        index_url="./O3/data/sta/index.json"
    }
    // 加载渲染json
    fetch(index_url)
        .then(response => {
            if (response.ok) {
                return response.json();
            }
        })
        .then(index => {
            indexData = index; // 存储索引数据
            // 获取滑动条和标签元素
            const slider = document.getElementById('timeline-slider');
            const label = document.getElementById('timestamp');
            lastDayStr=Object.keys(indexData).pop();
            if (dayStr in indexData) {
                selectDay=dayStr 
            }else{
                selectDay=lastDayStr // 如果没有传入日期，则使用最后一天的日期
            }
            hours=indexData[selectDay]
            slider.max = hours.length - 1; // 设置滑动条的最大值
            slider.value = slider.max; // 设置初始值为0
            dayhour=selectDay+hours[slider.max]; // 获取第一个时间戳
            label.innerHTML = `${dayhour.slice(0,4)}-${dayhour.slice(4,6)}-${dayhour.slice(6,8)} ${dayhour.slice(-2)}:00`;
            updateImageOverlay(dayhour); // 初始化地图图片
            updateLegendLabel(); // 更新图例标签
        })
        .catch(error => {
            console.error('Error fetching JSON:', error);
        });
}


/*
 * 更新渲染图
 */
function updateImageOverlay(dayhour) {
    let imgUrl=""
    if(selectType=="type-pm2.5"){
        imgUrl=`./PM25/data/png/Y${dayhour.slice(0,4)}-M${dayhour.slice(4,6)}-D${dayhour.slice(6,8)}/CHAP_NRT_NO2_${dayhour}00.png`;
    }else if(selectType=="type-no2"){
        imgUrl=`./NO2/data/png/Y${dayhour.slice(0,4)}-M${dayhour.slice(4,6)}-D${dayhour.slice(6,8)}/CHAP_NRT_NO2_${dayhour}00.png`;
    }else{
        imgUrl=`./O3/data/png/Y${dayhour.slice(0,4)}-M${dayhour.slice(4,6)}-D${dayhour.slice(6,8)}/CHAP_NRT_O3_${dayhour}00.png`;
    }
    // 如果已有覆盖层，先移除
    if (currentOverlay) {
        map.removeLayer(currentOverlay);
    }
    // 添加新的图片覆盖层
    currentOverlay = L.imageOverlay(imgUrl, imageBounds).addTo(map);
}

/*
 *根据气体类型更新图例   
*/
function updateLegendLabel() {
    if (selectType == "type-pm2.5") {
        document.getElementById('gas-label').innerHTML = 'PM2.5(ug/m3)';
        document.getElementById('tick0').innerHTML = '25';
        document.getElementById('tick1').innerHTML = '50';
        document.getElementById('tick2').innerHTML = '75';
        document.getElementById('tick3').innerHTML = '100';
        document.getElementById('tick4').innerHTML = '125';
        document.getElementById('tick5').innerHTML = '150';
        document.getElementById('tick6').innerHTML = '175';
    }else if (selectType == "type-no2") {
        document.getElementById('gas-label').innerHTML = 'NO2(ug/m3)';
        document.getElementById('tick0').innerHTML = '25';
        document.getElementById('tick1').innerHTML = '50';
        document.getElementById('tick2').innerHTML = '75';
        document.getElementById('tick3').innerHTML = '100';
        document.getElementById('tick4').innerHTML = '125';
        document.getElementById('tick5').innerHTML = '150';
        document.getElementById('tick6').innerHTML = '175';
    }else{
        document.getElementById('gas-label').innerHTML = 'O3(ug/m3)';
        document.getElementById('tick0').innerHTML = '25';
        document.getElementById('tick1').innerHTML = '50';
        document.getElementById('tick2').innerHTML = '75';
        document.getElementById('tick3').innerHTML = '100';
        document.getElementById('tick4').innerHTML = '125';
        document.getElementById('tick5').innerHTML = '150';
        document.getElementById('tick6').innerHTML = '175';
    }
}

/*
 * 加载区划geojson
 */
function loadGeoJSON() {
    fetch('./prov.json') // 替换为你的 GeoJSON 文件路径
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Failed to load GeoJSON');
        })
        .then(geojsonData => {
            // 使用 L.geoJSON 将 GeoJSON 数据添加到地图
            L.geoJSON(geojsonData, {
                style: function (feature) {
                    return {
                        color: '#1e78dc', // 边界颜色
                        weight: 1, // 边界宽度
                        fillOpacity: 0.1, // 填充透明度
                    };
                },
                onEachFeature: function (feature, layer) {
                    // 为每个 GeoJSON 特征添加弹窗
                    if (feature.properties && feature.properties.name) {
                        layer.bindPopup(`${feature.properties.name}`);
                    }
                }
            }).addTo(map);
        })
        .catch(error => {
            console.error('Error loading GeoJSON:', error);
        });
}

document.addEventListener('DOMContentLoaded', function () {
    loadData();
    loadGeoJSON();
});