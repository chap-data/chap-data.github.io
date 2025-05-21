var imageryLayer = L.tileLayer('https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}')
var streetLayer = L.tileLayer('https://services.arcgisonline.com/arcgis/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}')
var terrainLayer = L.tileLayer('https://services.arcgisonline.com/arcgis/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}')
var baseMaps = [imageryLayer, streetLayer, terrainLayer];
var currentBaseMapIndex = 0;
// 初始化地图
var map = L.map('map', {
    // crs: L.CRS.EPSG4326, 
    zoomControl: false,
    minZoom: 4,
}).setView([36, 105], 4); // 设置初始中心点和缩放级别
imageryLayer.addTo(map); // 添加影像图层
var indexData = null; // 用于存储索引数据
var selectDay = ""; // 用于存储选择的日期
var selectType = "type-aqi"; // 用于存储选择的类型
const imageBounds = [[54.0, 72.0], [11.5, 135.5]]; // 图片覆盖范围
var currentOverlay; // 用于存储当前的图片覆盖层
var meeLayer; // 用于存储当前的站点图层

/***********************************事件定义********************************************/
// 全图范围事件
document.getElementById('reset-view').addEventListener('click', function () {
    map.setView([36, 105], 4)
});
// 底图切换事件
document.getElementById('toggle-basemap').addEventListener('click', function () {
    // 移除当前底图
    map.removeLayer(baseMaps[currentBaseMapIndex]);

    // 切换到下一个底图
    currentBaseMapIndex = (currentBaseMapIndex + 1) % baseMaps.length;

    // 添加新的底图
    baseMaps[currentBaseMapIndex].addTo(map);
});
// 放大按钮事件
document.getElementById('zoom-in').addEventListener('click', function () {
    map.zoomIn(); // 调用 Leaflet 的 zoomIn 方法
});

// 缩小按钮事件
document.getElementById('zoom-out').addEventListener('click', function () {
    map.zoomOut(); // 调用 Leaflet 的 zoomOut 方法
});
// 气体类型切换事件
function changeGasType(event) {
    document.getElementById('type-aqi').className = 'type-button'
    document.getElementById('type-pm2.5').className = 'type-button'
    document.getElementById('type-pm10').className = 'type-button'
    document.getElementById('type-o3').className = 'type-button'
    document.getElementById('type-no2').className = 'type-button'
    document.getElementById('type-so2').className = 'type-button'
    document.getElementById('type-co').className = 'type-button'
    event.target.classList.add('selected')
    selectType = event.target.id; // 获取用户选择的气体类型
    loadData()
}
document.getElementById('type-aqi').addEventListener('click', changeGasType);
document.getElementById('type-pm2.5').addEventListener('click', changeGasType);
document.getElementById('type-pm10').addEventListener('click', changeGasType);
document.getElementById('type-o3').addEventListener('click', changeGasType);
document.getElementById('type-no2').addEventListener('click', changeGasType);
document.getElementById('type-so2').addEventListener('click', changeGasType);
document.getElementById('type-co').addEventListener('click', changeGasType);

// 监听日期选择框的变化
document.getElementById('date-picker').addEventListener('change', function (event) {
    const selectedDate = event.target.value; // 获取用户选择的日期

    // 根据选择的日期执行相应逻辑
    if (selectedDate) {
        selectDay = selectedDate.replace(/-/g, '');; // 更新选择的日期
        if (selectDay in indexData) {
            loadData(selectDay); // 重新加载数据
        } else {
            alert('数据不存在，请选择其他日期！');
        }
    }
});
// 滑动条切换事件
document.getElementById('timeline-slider').addEventListener('input', function () {
    const slider = document.getElementById('timeline-slider');
    const label = document.getElementById('timestamp');
    const index = parseInt(slider.value, 10);
    const dayhour = selectDay + indexData[selectDay][index];
    label.innerHTML = `${dayhour.slice(0, 4)}-${dayhour.slice(4, 6)}-${dayhour.slice(6, 8)} ${dayhour.slice(-2)}:00`;
    updateTopClock(dayhour); // 更新顶部时钟
    updateImageOverlay(dayhour); // 更新地图图片
    updateMEE(dayhour); // 加载MME数据
});
let playInterval = null; // 用于存储播放的定时器

// 播放按钮事件
document.getElementById('play-button').addEventListener('click', function () {
    const slider = document.getElementById('timeline-slider');
    const max = parseInt(slider.max, 10);

    // 如果已经在播放，停止播放
    if (playInterval) {
        clearInterval(playInterval);
        playInterval = null;
        this.textContent = '▶'; // 恢复播放按钮图标
        return;
    }

    // 从头开始播放
    slider.value = 0;
    this.textContent = '⏸'; // 切换为暂停图标

    // 开始自动播放
    playInterval = setInterval(() => {
        let currentValue = parseInt(slider.value, 10);

        if (currentValue < max) {
            slider.value = currentValue + 1; // 增加滑动条的值
            slider.dispatchEvent(new Event('input')); // 触发滑动条的 input 事件
        } else {
            clearInterval(playInterval); // 停止播放
            playInterval = null;
            this.textContent = '▶'; // 恢复播放按钮图标
        }
    }, 1000); // 每秒更新一次
});

/*
 * 加载json数据
 */
function loadData(dayStr) {
    // 根据气体类型确定json路径
    let index_url = ""
    if (selectType == "type-aqi") {
        index_url = "./AQI/data/sta/index.json"
    } else if (selectType == "type-pm2.5") {
        index_url = "./PM2_5/data/sta/index.json"
    } else if (selectType == "type-pm10") {
        index_url = "./PM10/data/sta/index.json"
    } else if (selectType == "type-no2") {
        index_url = "./NO2/data/sta/index.json"
    } else if (selectType == "type-so2") {
        index_url = "./SO2/data/sta/index.json"
    } else if (selectType == "type-co") {
        index_url = "./CO/data/sta/index.json"
    } else {
        index_url = "./O3/data/sta/index.json"
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
            lastDayStr = Object.keys(indexData).pop();
            if (dayStr in indexData) {
                selectDay = dayStr
            } else {
                selectDay = lastDayStr // 如果没有传入日期，则使用最后一天的日期
            }
            hours = indexData[selectDay]
            slider.max = hours.length - 1; // 设置滑动条的最大值
            slider.value = slider.max; // 设置初始值为0
            dayhour = selectDay + hours[slider.max]; // 获取第一个时间戳
            label.innerHTML = `${dayhour.slice(0, 4)}-${dayhour.slice(4, 6)}-${dayhour.slice(6, 8)} ${dayhour.slice(-2)}:00`;
            updateTopClock(dayhour); // 更新顶部时钟
            updateImageOverlay(dayhour); // 初始化地图图片
            updateLegendLabel(); // 更新图例标签
            updateMEE(dayhour); // 加载MME数据    
        })
        .catch(error => {
            console.error('Error fetching JSON:', error);
        });
}
/**
 * 根据类型字段和值确定点颜色
 */
function getColor(field, val) {
    let colors = ["rgb(49, 54, 149)",
        "rgb(74, 123, 183)",
        "rgb(128, 183, 214)",
        "rgb(189, 226, 238)",
        "rgb(238, 248, 223)",
        "rgb(254, 238, 165)",
        "rgb(253, 191, 113)",
        "rgb(246, 123, 74)",
        "rgb(218, 55, 42)",
        "rgb(165, 0, 38)"];
    if (field == "AQI" || field == "PM10") {
        if (val == 0) {
            return colors[0];
        } else if (val <= 50) {
            return colors[1];
        } else if (val <= 100) {
            return colors[2];
        } else if (val <= 150) {
            return colors[3];
        } else if (val <= 200) {
            return colors[4];
        } else if (val <= 250) {
            return colors[5];
        } else if (val <= 300) {
            return colors[6];
        } else if (val <= 350) {
            return colors[7];
        } else {
            return colors[8];
        }
    } else if (field == "PM2_5") {
        if (val == 0) {
            return colors[0];
        } else if (val <= 30) {
            return colors[1];
        } else if (val <= 60) {
            return colors[2];
        } else if (val <= 90) {
            return colors[3];
        } else if (val <= 120) {
            return colors[4];
        } else if (val <= 150) {
            return colors[5];
        } else if (val <= 180) {
            return colors[6];
        } else if (val <= 210) {
            return colors[7];
        } else {
            return colors[8];
        }
    } else if (field == "O3") {
        if (val == 0) {
            return colors[0];
        } else if (val <= 40) {
            return colors[1];
        } else if (val <= 80) {
            return colors[2];
        } else if (val <= 120) {
            return colors[3];
        } else if (val <= 160) {
            return colors[4];
        } else if (val <= 200) {
            return colors[5];
        } else if (val <= 240) {
            return colors[6];
        } else if (val <= 280) {
            return colors[7];
        } else {
            return colors[8];
        }
    } else if (field == "NO2" || field == "SO2") {
        if (val == 0) {
            return colors[0];
        } else if (val <= 10) {
            return colors[1];
        } else if (val <= 20) {
            return colors[2];
        } else if (val <= 30) {
            return colors[3];
        } else if (val <= 40) {
            return colors[4];
        } else if (val <= 50) {
            return colors[5];
        } else if (val <= 60) {
            return colors[6];
        } else if (val <= 70) {
            return colors[7];
        } else {
            return colors[8];
        }
    }
    else if (field == "CO") {
        if (val == 0) {
            return colors[0];
        } else if (val <= 0.3) {
            return colors[1];
        } else if (val <= 0.6) {
            return colors[2];
        } else if (val <= 0.9) {
            return colors[3];
        } else if (val <= 1.2) {
            return colors[4];
        } else if (val <= 1.5) {
            return colors[5];
        } else if (val <= 1.8) {
            return colors[6];
        } else if (val <= 2.1) {
            return colors[7];
        } else {
            return colors[8];
        }
    }

}
/**
 * 加载站点数据
 */
function updateMEE(dayhour) {
    year = dayhour.slice(0, 4);
    month = dayhour.slice(4, 6);
    day = dayhour.slice(6, 8);
    hour = dayhour.slice(-2);
    let mee_url = `./MEE/${year}/${month}/${day}/${hour}00.json`;

    // 选择不同的字段
    let fieldMap = {
        "type-aqi": "AQI",
        "type-pm2.5": "PM2_5",
        "type-pm10": "PM10",
        "type-no2": "NO2",
        "type-so2": "SO2",
        "type-co": "CO",
        "type-o3": "O3"
    };
    let field = fieldMap[selectType] || "AQI";

    // 先移除旧的站点图层
    if (meeLayer) {
        map.removeLayer(meeLayer);
    }

    fetch(mee_url)
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Failed to load mee');
        })
        .then(geojsonData => {
            meeLayer = L.geoJSON(geojsonData, {
                pointToLayer: function (feature, latlng) {
                    let val = feature.properties[field];
                    return L.circleMarker(latlng, {
                        radius: 4,
                        fillColor: getColor(field,val),
                        color: "#fff",
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.85
                    });
                },
                onEachFeature: function (feature, layer) {
                    let name = feature.properties.name || "";
                    let val = feature.properties[field];
                    layer.bindPopup(`${name}<br>${field}: ${val}`);
                }
            }).addTo(map);
        })
        .catch(error => {
            console.error('Error loading GeoJSON:', error);
        });
}

/**
 * 更新顶部时钟
 */
function updateTopClock(dayhour) {
    const clock = document.getElementById('top-clock');
    year = dayhour.slice(0, 4)
    month = dayhour.slice(4, 6)
    day = dayhour.slice(6, 8)
    hour = dayhour.slice(-2)
    clock.innerHTML = `
        <div class="clock-time">${hour}:00</div>
        <div class="clock-date">${year}-${month}-${day}</div>
    `;
}

/*
 * 更新渲染图
 */
function updateImageOverlay(dayhour) {
    let imgUrl = ""
    if (selectType == "type-aqi") {
        imgUrl = `./AQI/data/png/Y${dayhour.slice(0, 4)}-M${dayhour.slice(4, 6)}-D${dayhour.slice(6, 8)}/CHAP_NRT_AQI_${dayhour}00.png`;
    } else if (selectType == "type-pm2.5") {
        imgUrl = `./PM2_5/data/png/Y${dayhour.slice(0, 4)}-M${dayhour.slice(4, 6)}-D${dayhour.slice(6, 8)}/CHAP_NRT_PM2_5_${dayhour}00.png`;
    } else if (selectType == "type-pm10") {
        imgUrl = `./PM10/data/png/Y${dayhour.slice(0, 4)}-M${dayhour.slice(4, 6)}-D${dayhour.slice(6, 8)}/CHAP_NRT_PM10_${dayhour}00.png`;
    } else if (selectType == "type-no2") {
        imgUrl = `./NO2/data/png/Y${dayhour.slice(0, 4)}-M${dayhour.slice(4, 6)}-D${dayhour.slice(6, 8)}/CHAP_NRT_NO2_${dayhour}00.png`;
    } else if (selectType == "type-so2") {
        imgUrl = `./SO2/data/png/Y${dayhour.slice(0, 4)}-M${dayhour.slice(4, 6)}-D${dayhour.slice(6, 8)}/CHAP_NRT_SO2_${dayhour}00.png`;
    } else if (selectType == "type-co") {
        imgUrl = `./CO/data/png/Y${dayhour.slice(0, 4)}-M${dayhour.slice(4, 6)}-D${dayhour.slice(6, 8)}/CHAP_NRT_CO_${dayhour}00.png`;
    } else {
        imgUrl = `./O3/data/png/Y${dayhour.slice(0, 4)}-M${dayhour.slice(4, 6)}-D${dayhour.slice(6, 8)}/CHAP_NRT_O3_${dayhour}00.png`;
    }

    // 创建一个 Image 对象用于预加载图片
    const img = new Image();
    img.src = imgUrl;

    // 当图片加载完成后再更新地图覆盖层
    img.onload = function () {
        // 如果已有覆盖层，先移除
        if (currentOverlay) {
            map.removeLayer(currentOverlay);
        }
        // 添加新的图片覆盖层
        currentOverlay = L.imageOverlay(imgUrl, imageBounds).addTo(map);
    };
}

/*
 *根据气体类型更新图例   
*/
function updateLegendLabel() {
    if (selectType == "type-aqi") {
        document.getElementById('gas-label').innerHTML = 'AQI:';
        document.getElementById('tick0').innerHTML = '50';
        document.getElementById('tick1').innerHTML = '100';
        document.getElementById('tick2').innerHTML = '150';
        document.getElementById('tick3').innerHTML = '200';
        document.getElementById('tick4').innerHTML = '250';
        document.getElementById('tick5').innerHTML = '300';
        document.getElementById('tick6').innerHTML = '350';
    } else if (selectType == "type-pm2.5") {
        document.getElementById('gas-label').innerHTML = 'PM<sub>2.5</sub> (&mu;g/m<sup>3</sup>):';
        document.getElementById('tick0').innerHTML = '30';
        document.getElementById('tick1').innerHTML = '60';
        document.getElementById('tick2').innerHTML = '90';
        document.getElementById('tick3').innerHTML = '120';
        document.getElementById('tick4').innerHTML = '150';
        document.getElementById('tick5').innerHTML = '180';
        document.getElementById('tick6').innerHTML = '210';
    } else if (selectType == "type-pm10") {
        document.getElementById('gas-label').innerHTML = 'PM<sub>10</sub> (&mu;g/m<sup>3</sup>):';
        document.getElementById('tick0').innerHTML = '50';
        document.getElementById('tick1').innerHTML = '100';
        document.getElementById('tick2').innerHTML = '150';
        document.getElementById('tick3').innerHTML = '200';
        document.getElementById('tick4').innerHTML = '250';
        document.getElementById('tick5').innerHTML = '300';
        document.getElementById('tick6').innerHTML = '350';
    } else if (selectType == "type-no2") {
        document.getElementById('gas-label').innerHTML = 'NO<sub>2</sub> (&mu;g/m<sup>3</sup>):';
        document.getElementById('tick0').innerHTML = '10';
        document.getElementById('tick1').innerHTML = '20';
        document.getElementById('tick2').innerHTML = '30';
        document.getElementById('tick3').innerHTML = '40';
        document.getElementById('tick4').innerHTML = '50';
        document.getElementById('tick5').innerHTML = '60';
        document.getElementById('tick6').innerHTML = '70';
    } else if (selectType == "type-so2") {
        document.getElementById('gas-label').innerHTML = 'SO<sub>2</sub> (&mu;g/m<sup>3</sup>):';
        document.getElementById('tick0').innerHTML = '10';
        document.getElementById('tick1').innerHTML = '20';
        document.getElementById('tick2').innerHTML = '30';
        document.getElementById('tick3').innerHTML = '40';
        document.getElementById('tick4').innerHTML = '50';
        document.getElementById('tick5').innerHTML = '60';
        document.getElementById('tick6').innerHTML = '70';
    } else if (selectType == "type-co") {
        document.getElementById('gas-label').innerHTML = 'CO (mg/m<sup>3</sup>):';
        document.getElementById('tick0').innerHTML = '0.3';
        document.getElementById('tick1').innerHTML = '0.6';
        document.getElementById('tick2').innerHTML = '0.9';
        document.getElementById('tick3').innerHTML = '1.2';
        document.getElementById('tick4').innerHTML = '1.5';
        document.getElementById('tick5').innerHTML = '1.8';
        document.getElementById('tick6').innerHTML = '2.1';
    } else {
        document.getElementById('gas-label').innerHTML = 'O<sub>3</sub> (&mu;g/m<sup>3</sup>):';
        document.getElementById('tick0').innerHTML = '50';
        document.getElementById('tick1').innerHTML = '100';
        document.getElementById('tick2').innerHTML = '150';
        document.getElementById('tick3').innerHTML = '200';
        document.getElementById('tick4').innerHTML = '250';
        document.getElementById('tick5').innerHTML = '300';
        document.getElementById('tick6').innerHTML = '350';
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
                        color: '#cccccc',      // 浅灰色边界线
                        weight: 2,             // 边界宽度
                        fillOpacity: 0,        // 无填充
                        opacity: 0.8           // 边界线透明度
                    };
                },
                onEachFeature: function (feature, layer) {
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
