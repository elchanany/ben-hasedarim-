
import React, { useState, useEffect, useCallback, useRef } from 'react';

const AccessibilityIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" focusable="false" aria-hidden="true" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);


interface AccessibilitySettings {
  highContrast: boolean;
  fontSize: 'default' | 'medium' | 'large' | 'xlarge';
  animationsDisabled: boolean;
  highlightLinks: boolean;
  highlightHeadings: boolean;
  grayscaleMode: boolean;
  accessibleFont: boolean;
}

const defaultSettings: AccessibilitySettings = {
  highContrast: false,
  fontSize: 'default',
  animationsDisabled: false,
  highlightLinks: false,
  highlightHeadings: false,
  grayscaleMode: false,
  accessibleFont: false,
};

const FONT_SIZE_CLASSES: Record<AccessibilitySettings['fontSize'], string> = {
    default: '', 
    medium: 'font-scale-medium',
    large: 'font-scale-large',
    xlarge: 'font-scale-xlarge'
};


export const AccessibilityWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const applySettings = useCallback((currentSettings: AccessibilitySettings) => {
    const htmlElement = document.documentElement;
    htmlElement.classList.toggle('high-contrast', currentSettings.highContrast);
    
    Object.values(FONT_SIZE_CLASSES).forEach(className => {
        if (className) htmlElement.classList.remove(className);
    });
    if (currentSettings.fontSize !== 'default' && FONT_SIZE_CLASSES[currentSettings.fontSize]) {
        htmlElement.classList.add(FONT_SIZE_CLASSES[currentSettings.fontSize]);
    }

    htmlElement.classList.toggle('animations-disabled', currentSettings.animationsDisabled);
    htmlElement.classList.toggle('highlight-links', currentSettings.highlightLinks);
    htmlElement.classList.toggle('highlight-headings', currentSettings.highlightHeadings);
    htmlElement.classList.toggle('grayscale-mode', currentSettings.grayscaleMode);
    htmlElement.classList.toggle('font-accessible', currentSettings.accessibleFont);
  }, []);

  useEffect(() => {
    const savedSettings = localStorage.getItem('accessibilitySettings');
    let activeSettings = defaultSettings;
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        activeSettings = {
          highContrast: typeof parsedSettings.highContrast === 'boolean' ? parsedSettings.highContrast : defaultSettings.highContrast,
          fontSize: ['default', 'medium', 'large', 'xlarge'].includes(parsedSettings.fontSize) ? parsedSettings.fontSize : defaultSettings.fontSize,
          animationsDisabled: typeof parsedSettings.animationsDisabled === 'boolean' ? parsedSettings.animationsDisabled : defaultSettings.animationsDisabled,
          highlightLinks: typeof parsedSettings.highlightLinks === 'boolean' ? parsedSettings.highlightLinks : defaultSettings.highlightLinks,
          highlightHeadings: typeof parsedSettings.highlightHeadings === 'boolean' ? parsedSettings.highlightHeadings : defaultSettings.highlightHeadings,
          grayscaleMode: typeof parsedSettings.grayscaleMode === 'boolean' ? parsedSettings.grayscaleMode : defaultSettings.grayscaleMode,
          accessibleFont: typeof parsedSettings.accessibleFont === 'boolean' ? parsedSettings.accessibleFont : defaultSettings.accessibleFont,
        };
      } catch (e) {
        console.error("Error parsing accessibility settings from localStorage", e);
        activeSettings = defaultSettings;
      }
    }
    setSettings(activeSettings);
    applySettings(activeSettings);
  }, [applySettings]);

  const toggleSetting = (key: keyof Omit<AccessibilitySettings, 'fontSize'>) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: !prev[key] };
      localStorage.setItem('accessibilitySettings', JSON.stringify(newSettings));
      applySettings(newSettings);
      return newSettings;
    });
  };

  const setFontSize = (size: AccessibilitySettings['fontSize']) => {
    setSettings(prev => {
        const newSettings = { ...prev, fontSize: size };
        localStorage.setItem('accessibilitySettings', JSON.stringify(newSettings));
        applySettings(newSettings);
        return newSettings;
    });
  };
  
  const resetSettings = () => {
    localStorage.removeItem('accessibilitySettings');
    setSettings(defaultSettings);
    applySettings(defaultSettings);
    // Keep panel open for user to see changes or make new ones
    // setIsOpen(false); 
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };
    const handleClickOutside = (event: MouseEvent) => {
        if (panelRef.current && !panelRef.current.contains(event.target as Node) &&
            buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
            setIsOpen(false);
        }
    };

    let focusableElements: NodeListOf<HTMLElement> | undefined;
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !panelRef.current || !isOpen) return;

      focusableElements = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) { 
        if (document.activeElement === firstElement) {
          lastElement.focus();
          event.preventDefault();
        }
      } else { 
        if (document.activeElement === lastElement) {
          firstElement.focus();
          event.preventDefault();
        }
      }
    };


    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('keydown', trapFocus);
      document.addEventListener('mousedown', handleClickOutside);
      
      focusableElements = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements && focusableElements.length > 0) {
        focusableElements[0].focus();
      } else {
        panelRef.current?.focus();
      }

    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', trapFocus);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getButtonClass = (isActive: boolean) => 
    `w-full text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-focus-ring-color ${isActive ? 'active-acc-toggle' : ''}`;

  return (
    <>
      <button
        ref={buttonRef}
        className="accessibility-widget-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "סגור תפריט נגישות" : "פתח תפריט נגישות"}
        aria-expanded={isOpen}
        aria-controls="accessibility-panel-content"
      >
        <AccessibilityIcon className="w-7 h-7" />
      </button>
      {isOpen && (
        <div 
            id="accessibility-panel-content"
            ref={panelRef}
            className="accessibility-panel" 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="accessibility-panel-title"
            tabIndex={-1} 
        >
          <h2 id="accessibility-panel-title" className="text-lg font-semibold mb-2 text-center">התאמות נגישות</h2>
          
          <button onClick={() => toggleSetting('highContrast')} className={getButtonClass(settings.highContrast)} aria-pressed={settings.highContrast}>
            {settings.highContrast ? 'בטל ניגודיות גבוהה' : 'הפעל ניגודיות גבוהה'}
          </button>

          <div className="space-y-1">
            <p id="font-size-label" className="text-sm font-medium text-right mb-1 text-dark-text">גודל גופן:</p>
            <div className="flex justify-between gap-1" role="group" aria-labelledby="font-size-label">
                <button onClick={() => setFontSize('default')} className={`flex-1 text-xs ${getButtonClass(settings.fontSize === 'default')}`} aria-pressed={settings.fontSize === 'default'}>רגיל</button>
                <button onClick={() => setFontSize('medium')} className={`flex-1 text-xs ${getButtonClass(settings.fontSize === 'medium')}`} aria-pressed={settings.fontSize === 'medium'}>בינוני</button>
                <button onClick={() => setFontSize('large')} className={`flex-1 text-xs ${getButtonClass(settings.fontSize === 'large')}`} aria-pressed={settings.fontSize === 'large'}>גדול</button>
                <button onClick={() => setFontSize('xlarge')} className={`flex-1 text-xs ${getButtonClass(settings.fontSize === 'xlarge')}`} aria-pressed={settings.fontSize === 'xlarge'}>גדול מאד</button>
            </div>
          </div>
          
          <button onClick={() => toggleSetting('highlightHeadings')} className={getButtonClass(settings.highlightHeadings)} aria-pressed={settings.highlightHeadings}>
            {settings.highlightHeadings ? 'בטל הדגשת כותרות' : 'הדגש כותרות'}
          </button>
          
          <button onClick={() => toggleSetting('grayscaleMode')} className={getButtonClass(settings.grayscaleMode)} aria-pressed={settings.grayscaleMode}>
            {settings.grayscaleMode ? 'בטל גווני אפור' : 'הפעל גווני אפור'}
          </button>

          <button onClick={() => toggleSetting('animationsDisabled')} className={getButtonClass(settings.animationsDisabled)} aria-pressed={settings.animationsDisabled}>
            {settings.animationsDisabled ? 'הפעל אנימציות' : 'הפסק אנימציות'}
          </button>
          
          <button onClick={() => toggleSetting('highlightLinks')} className={getButtonClass(settings.highlightLinks)} aria-pressed={settings.highlightLinks}>
            {settings.highlightLinks ? 'בטל הדגשת קישורים' : 'הדגש קישורים'}
          </button>

          <button onClick={() => toggleSetting('accessibleFont')} className={getButtonClass(settings.accessibleFont)} aria-pressed={settings.accessibleFont}>
            {settings.accessibleFont ? 'בטל פונט נגיש' : 'הפעל פונט נגיש'}
          </button>

          <hr className="my-2 border-gray-300 html.high-contrast:border-hc-border-color" />
          <button onClick={resetSettings} className={`w-full mt-2 px-3 py-1.5 text-sm font-semibold rounded-lg border-2 border-gray-400 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-focus-ring-color`}>
            אפס הגדרות נגישות
          </button>
           <button onClick={() => { setIsOpen(false); buttonRef.current?.focus(); }} className={`w-full mt-3 px-3 py-1.5 text-sm font-semibold rounded-lg border-2 border-gray-400 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-focus-ring-color`}>
            סגור תפריט
          </button>
        </div>
      )}
    </>
  );
};
