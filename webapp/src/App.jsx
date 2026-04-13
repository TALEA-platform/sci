import { useState, useCallback } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import MethodologySection from './components/MethodologySection';
import AboutSection from './components/AboutSection';
import SectionTabs from './components/SectionTabs';
import DayExplorer from './components/DayExplorer';
import AggregationExplorer from './components/AggregationExplorer';
import PolygonExplorer from './components/PolygonExplorer';
import Footer from './components/Footer';
import { MANIFEST } from './data/config';
import './App.css';

export default function App() {
  const [activeView, setActiveView] = useState(MANIFEST.defaults.view);
  const [selectedArea, setSelectedArea] = useState(MANIFEST.defaults.area);
  const [selectedDate, setSelectedDate] = useState(MANIFEST.defaults.date);
  const [selectedTime, setSelectedTime] = useState(MANIFEST.defaults.time);
  const [selectedMonth, setSelectedMonth] = useState(MANIFEST.defaults.month);
  const [selectedPeriod, setSelectedPeriod] = useState(MANIFEST.defaults.period);
  const [selectedPolygonLayer, setSelectedPolygonLayer] = useState(
    MANIFEST.defaults.polygonLayer
  );
  const [selectedMetric, setSelectedMetric] = useState(MANIFEST.defaults.metric);
  const [selectedSurfaceType, setSelectedSurfaceType] = useState(
    MANIFEST.defaults.surfaceType
  );
  const [displayMode, setDisplayMode] = useState('satellite');
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const handleViewChange = useCallback((view) => {
    setActiveView(view);
  }, []);

  return (
    <div className="app-shell">
      <Header />

      <Hero />

      <MethodologySection
        isOpen={methodologyOpen}
        onClose={() => setMethodologyOpen(false)}
      />

      <AboutSection
        isOpen={aboutOpen}
        onClose={() => setAboutOpen(false)}
      />

      <main id="explorer" className="explorer-section">
        <SectionTabs
          activeView={activeView}
          onChange={handleViewChange}
          onOpenMethodology={() => setMethodologyOpen(true)}
          onOpenAbout={() => setAboutOpen(true)}
        />

        <div className="view-container">
          {activeView === 'day' && (
            <div role="tabpanel" id="panel-day" aria-labelledby="tab-day">
              <DayExplorer
                selectedArea={selectedArea}
                setSelectedArea={setSelectedArea}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                selectedTime={selectedTime}
                setSelectedTime={setSelectedTime}
                displayMode={displayMode}
                setDisplayMode={setDisplayMode}
              />
            </div>
          )}

          {activeView === 'aggregations' && (
            <div role="tabpanel" id="panel-aggregations" aria-labelledby="tab-aggregations">
              <AggregationExplorer
                selectedArea={selectedArea}
                setSelectedArea={setSelectedArea}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                selectedPeriod={selectedPeriod}
                setSelectedPeriod={setSelectedPeriod}
                selectedSurfaceType={selectedSurfaceType}
                setSelectedSurfaceType={setSelectedSurfaceType}
              />
            </div>
          )}

          {activeView === 'polygons' && (
            <div role="tabpanel" id="panel-polygons" aria-labelledby="tab-polygons">
              <PolygonExplorer
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                selectedPeriod={selectedPeriod}
                setSelectedPeriod={setSelectedPeriod}
                selectedPolygonLayer={selectedPolygonLayer}
                setSelectedPolygonLayer={setSelectedPolygonLayer}
                selectedMetric={selectedMetric}
                setSelectedMetric={setSelectedMetric}
              />
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
