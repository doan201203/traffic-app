import "./App.css";
import Tabs from "./Components/TabComponent/Tabs";
import NotificationComponent from "./Components/Notifications/NotificationComponent.js";
const App = () => {
  return (
    <div className="App">
      <Tabs />
      <div className="notification">
        <NotificationComponent />
      </div>
    </div>
  );
}
export default App;