import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import "mapbox-gl/dist/mapbox-gl.css";
import '../../App.css';
import { environment } from '../../Environments/EnvDev';

// Cấu hình Mapbox
mapboxgl.accessToken = environment.mapbox.accessToken;

const MapboxComponent = () => {
  // Refs để lưu trữ các tham chiếu đến các thành phần
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const directionsRef = useRef(null); // Ref cho điều khiển chỉ đường
  const userMarkerRef = useRef(null); // Ref cho marker vị trí người dùng
  const watchIdRef = useRef(null); // Ref cho ID theo dõi vị trí
  const geoLocateControlRef = useRef(null);

  // States để quản lý trạng thái
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lng, setLng] = useState(null);
  const [lat, setLat] = useState(null);

  // Xử lý khi lấy vị trí thành công
  const handleGeolocationSuccess = (position) => {
    console.log('Đã lấy được vị trí:', position);
    setLng(position.coords.longitude);
    setLat(position.coords.latitude);
    setIsLoading(false);
  };

  // Xử lý khi có lỗi lấy vị trí
  const handleGeolocationError = (error) => {
    console.error('Lỗi định vị:', error);
    switch(error.code) {
      case error.PERMISSION_DENIED:
        setError('Quyền truy cập vị trí bị từ chối. Vui lòng bật quyền truy cập vị trí trong cài đặt trình duyệt và làm mới trang.');
        break;
      case error.POSITION_UNAVAILABLE:
        setError('Không thể lấy thông tin vị trí. Vui lòng kiểm tra cài đặt thiết bị của bạn.');
        break;
      case error.TIMEOUT:
        setError('Request vị trí hết thời gian chờ. Vui lòng thử lại.');
        break;
      default:
        setError('Đã xảy ra lỗi khi lấy vị trí của bạn. Vui lòng thử lại.');
    }
    setIsLoading(false);
  };

  // Khởi tạo theo dõi vị trí
  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Trình duyệt của bạn không hỗ trợ định vị.');
      setIsLoading(false);
      return;
    }

    // Kiểm tra quyền truy cập vị trí
    navigator.permissions.query({ name: 'geolocation' }).then(function(permissionStatus) {
      console.log('Trạng thái quyền định vị:', permissionStatus.state);
      
      if (permissionStatus.state === 'denied') {
        setError('Quyền truy cập vị trí bị từ chối. Vui lòng bật quyền truy cập vị trí trong cài đặt trình duyệt và làm mới trang.');
        setIsLoading(false);
        return;
      }

      // Theo dõi vị trí nếu có quyền
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleGeolocationSuccess,
        handleGeolocationError,
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 30000
        }
      );

      // Lắng nghe thay đổi quyền
      permissionStatus.onchange = function() {
        console.log('Trạng thái quyền đã thay đổi:', this.state);
        if (this.state === 'denied') {
          setError('Quyền truy cập vị trí bị từ chối. Vui lòng bật quyền truy cập vị trí trong cài đặt trình duyệt và làm mới trang.');
          setIsLoading(false);
        }
      };
    });

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Khởi tạo bản đồ
  useEffect(() => {
    if (!mapContainerRef.current || lng === null || lat === null || isLoading) return;

    try {
      console.log('Đang khởi tạo bản đồ...');
      
      // Khởi tạo bản đồ
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [lng, lat],
        zoom: 17,
      });

      // Thêm điều khiển điều hướng
      mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Khởi tạo điều khiển vị trí
      geoLocateControlRef.current = new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true,
      });

      // Xử lý sự kiện khi người dùng click vào nút định vị
      geoLocateControlRef.current.on('geolocate', (e) => {
        const lng = e.coords.longitude;
        const lat = e.coords.latitude;
        
        // Di chuyển bản đồ đến vị trí mới với zoom level 15
        mapRef.current.flyTo({
          center: [lng, lat],
          zoom: 17,
          essential: true,
          duration: 2000 // Thời gian di chuyển 2 giây
        });
      });

      mapRef.current.addControl(geoLocateControlRef.current);

      // Tải chỉ đường
      const loadDirections = () => {
        console.log('Đang tải tính năng chỉ đường...');
        const script = document.createElement('script');
        script.src = 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-directions/v4.1.0/mapbox-gl-directions.js';
        script.async = true;

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-directions/v4.1.0/mapbox-gl-directions.css';
        document.head.appendChild(link);

        script.onload = () => {
          if (window.MapboxDirections && mapRef.current && !directionsRef.current) {
            directionsRef.current = new window.MapboxDirections({
              accessToken: mapboxgl.accessToken,
              profile: 'mapbox/driving',
              alternatives: false,
              unit: 'metric',
              language: 'vi',
            });
            mapRef.current.addControl(directionsRef.current, 'top-left');
            console.log('Đã tải xong tính năng chỉ đường');
          }
        };
        document.body.appendChild(script);
      };

      loadDirections();

      // Xử lý khi bản đồ tải xong
      mapRef.current.on('load', () => {
        console.log('Bản đồ đã tải xong');
        mapRef.current.resize();
        if (geoLocateControlRef.current) {
          geoLocateControlRef.current.trigger();
        }
      });

    } catch (err) {
      console.error('Lỗi khởi tạo bản đồ:', err);
      setError('Không thể khởi tạo bản đồ. Vui lòng làm mới trang.');
    }

    // Dọn dẹp khi unmount
    return () => {
      if (mapRef.current) {
        if (directionsRef.current) {
          try {
            mapRef.current.removeControl(directionsRef.current);
          } catch (e) {
            console.warn('Lỗi khi xóa điều khiển chỉ đường:', e);
          }
          directionsRef.current = null;
        }
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [lat, lng, isLoading]);

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (isLoading) {
    return <div className="loading-message">Đang tải bản đồ...</div>;
  }

  return (
    <div className="map-container" ref={mapContainerRef} />
  );
};

export default MapboxComponent;
