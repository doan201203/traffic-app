import React, { useState } from "react";
import TabNavItem from "./TabNavItem.js";
import TabContent from "./TabContent.js";
import MapboxComponent from "../MapboxComponent/MapboxComponent.js";
 
const Tabs = () => {
  const [activeTab, setActiveTab] = useState("mapbox");
 
  return (
    <div className="Tabs">
      {/* <ul className="nav">
        <TabNavItem title="Mapbox" id="mapbox" activeTab={activeTab} setActiveTab={setActiveTab}/>
      </ul> */}
 
      <div className="outlet">
        <TabContent id="mapbox" activeTab={activeTab}>
          <h1>Ung dung canh bao giao thong</h1>
          <MapboxComponent></MapboxComponent>
        </TabContent>
      </div>
    </div>
  );
};

export default Tabs;