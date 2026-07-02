import React, { useState } from "react";
import PhaseNav from "./components/shared/PhaseNav.jsx";
import ClientHeader from "./components/shared/ClientHeader.jsx";
import Phase0Setup from "./components/phases/Phase0Setup.jsx";
import Phase1Onboarding from "./components/phases/Phase1Onboarding.jsx";
import Phase2Confirmation from "./components/phases/Phase2Confirmation.jsx";
import Phase3ProductRules from "./components/phases/Phase3ProductRules.jsx";
import Phase5Grouping from "./components/phases/Phase5Grouping.jsx";
import Phase6Generation from "./components/phases/Phase6Generation.jsx";
import Phase7Deploy from "./components/phases/Phase7Deploy.jsx";

const PHASES = [
  { id: 0, label: "Client Setup",     short: "Setup"      },
  { id: 1, label: "API Onboarding",   short: "API"        },
  { id: 2, label: "Confirmation",     short: "Confirm"    },
  { id: 3, label: "Product Rules",    short: "Rules"      },
  { id: 5, label: "Tool Grouping",    short: "Group"      },
  { id: 6, label: "File Generation",  short: "Generate"   },
  { id: 7, label: "Deploy",           short: "Deploy"     },
];

export default function App() {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [clientConfig, setClientConfig]   = useState(null);
  const [registry,     setRegistry]       = useState(null);
  const [toolGroups,   setToolGroups]     = useState(null);
  const [generatedFiles, setGeneratedFiles] = useState(null);

  const goToPhase = (phaseId) => setCurrentPhase(phaseId);

  const phaseProps = {
    clientConfig,
    registry,
    toolGroups,
    generatedFiles,
    onClientSetup:   (cfg)     => { setClientConfig(cfg);       goToPhase(1); },
    onApiOnboarded:  (reg)     => { setRegistry(reg);            goToPhase(2); },
    onConfirmed:     (reg)     => { setRegistry(reg);            goToPhase(3); },
    onRulesApproved: (reg)     => { setRegistry(reg);            goToPhase(5); },
    onGroupsApproved:(groups)  => { setToolGroups(groups);       goToPhase(6); },
    onFilesGenerated:(files)   => { setGeneratedFiles(files);    goToPhase(7); },
    onAddAnotherApi: ()        => { setRegistry(null); setToolGroups(null); setGeneratedFiles(null); goToPhase(1); },
  };

  const renderPhase = () => {
    switch (currentPhase) {
      case 0: return <Phase0Setup     {...phaseProps} />;
      case 1: return <Phase1Onboarding {...phaseProps} />;
      case 2: return <Phase2Confirmation {...phaseProps} />;
      case 3: return <Phase3ProductRules {...phaseProps} />;
      case 5: return <Phase5Grouping  {...phaseProps} />;
      case 6: return <Phase6Generation {...phaseProps} />;
      case 7: return <Phase7Deploy    {...phaseProps} />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Left sidebar */}
      <PhaseNav phases={PHASES} currentPhase={currentPhase} onNavigate={goToPhase} clientConfig={clientConfig} />

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <ClientHeader clientConfig={clientConfig} currentPhase={currentPhase} phases={PHASES} />
        <main className="flex-1 overflow-y-auto p-6">
          {renderPhase()}
        </main>
      </div>
    </div>
  );
}
