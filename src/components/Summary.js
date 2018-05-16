import React, { Component } from 'react';
import PropTypes from 'prop-types';
import FontAwesome from 'react-fontawesome';
import Collapsible from 'react-collapsible';
import ReactTooltip from 'react-tooltip';
import ReactTable from 'react-table';

import summaryMap from './summary.json';
import * as formatit from '../helpers/formatit';

import MedicalHistoryIcon from '../icons/MedicalHistoryIcon';
import PainIcon from '../icons/PainIcon';
import TreatmentsIcon from '../icons/TreatmentsIcon';
import RiskIcon from '../icons/RiskIcon';
import CQLIcon from '../icons/CQLIcon';

import InclusionBanner from './InclusionBanner';
import ExclusionBanner from './ExclusionBanner';
import DevTools from './DevTools';

export default class Summary extends Component {
  isSectionFlagged(section) {
    const { sectionFlags } = this.props;
    const subSections = Object.keys(sectionFlags[section]);

    for (let i = 0; i < subSections.length; ++i) {
      if (this.isSubsectionFlagged(section, subSections[i])) {
        return true;
      }
    }

    return false;
  }

  isSubsectionFlagged(section, subSection) {
    const { sectionFlags } = this.props;
    if (sectionFlags[section][subSection] === true) {
      return true;
    } else if (sectionFlags[section][subSection] === false) {
      return false;
    } else {
      return sectionFlags[section][subSection].length > 0;
    }
  }

  isEntryFlagged(section, subSection, entry) {
    const { sectionFlags } = this.props;

    if (Array.isArray(sectionFlags[section][subSection])) {
      return sectionFlags[section][subSection].indexOf(entry._id) >= 0;
    }

    return sectionFlags[section][subSection];
  }

  renderNoEntries(section, subSection) {
    const flagged = this.isSubsectionFlagged(section, subSection.dataKey);
    const flaggedClass = flagged ? 'flagged' : '';
    const tooltip = flagged ? subSection.tables[0].flagsText : '';

    return (
      <div className="table">
        <div className="no-entries">
          <FontAwesome
            className={`flag flag-no-entry ${flaggedClass}`}
            name="circle"
            data-tip={tooltip}
          />
          no entries found
        </div>
      </div>
    );
  }

  renderTable(table, entries, section, subSection, index) {
    // If a filter is provided, only render those things that have the filter field (or don't have it when it's negated)
    let filteredEntries = entries;
    if (table.filter && table.filter.length > 0) {
      // A filter starting with '!' is negated (looking for absence of that field)
      const negated = table.filter[0] === '!';
      const filter = negated ? table.filter.substring(1) : table.filter;
      filteredEntries = entries.filter(e => negated ? e[filter] == null : e[filter] != null);
    }
    if (filteredEntries.length === 0) return null;

    const headers = Object.keys(table.headers);

    let columns = [
      {
        id: 'flagged',
        Header: '',
        accessor: (entry) => this.isEntryFlagged(section, subSection.dataKey, entry),
        Cell: (props) =>
          <FontAwesome
            className={`flag flag-entry ${props.value ? 'flagged' : ''}`}
            name="circle"
            data-tip={props.value ? subSection.tables[0].flagsText : ''} />,
        sortable: false,
        width: 35,
        minWidth: 35
      }
    ];

    headers.forEach((header) => {
      const headerKey = table.headers[header];

      const column = {
        id: header,
        Header: () => <span className="col-header">{header}</span>,
        accessor: (entry) => {
          let value = entry[headerKey];
          if (headerKey.formatter) {
            const { result } = this.props;
            let formatterArguments = headerKey.formatterArguments || [];
            value = formatit[headerKey.formatter](result, entry[headerKey.key], ...formatterArguments);
          }

          return value;
        },
        sortable: headerKey.sortable !== false
      };

      if (headerKey.minWidth != null) {
        column.minWidth = headerKey.minWidth;
      }

      if (headerKey.maxWidth != null) {
        column.maxWidth = headerKey.maxWidth;
      }

      columns.push(column);
    });

    return (
      <div key={index} className="table">
        <ReactTable
          className="sub-section__table"
          columns={columns}
          data={filteredEntries}
          minRows={1}
          showPagination={filteredEntries.length > 10}
          pageSizeOptions={[10, 20, 50, 100]}
          defaultPageSize={10}
          resizable={false}
        />
      </div>
    );
  }

  renderSection(section) {
    const sectionMap = summaryMap[section];

    return sectionMap.map((subSection) => {
      const data = this.props.summary[subSection.dataKeySource][subSection.dataKey];
      const entries = (Array.isArray(data) ? data : [data]).filter(r => r != null);
      const hasEntries = entries.length !== 0;

      const flagged = this.isSubsectionFlagged(section, subSection.dataKey);
      const flaggedClass = flagged ? 'flagged' : '';

      return (
        <div key={subSection.dataKey} className="sub-section h3-wrapper">
          <h3 id={subSection.dataKey} className="sub-section__header">
            <FontAwesome className={`flag flag-nav ${flaggedClass}`} name="circle" />
            {subSection.name}
            <FontAwesome className={`flag flag-summary ${flaggedClass}`} name="circle" />
          </h3>

          {!hasEntries && this.renderNoEntries(section, subSection)}
          {hasEntries && subSection.tables.map((table, index) =>
            this.renderTable(table, entries, section, subSection, index))
          }
         </div>
      );
    });
  }

  renderSectionHeader(section) {
    const flagged = this.isSectionFlagged(section);
    const flaggedClass = flagged ? 'flagged' : '';
    const { numMedicalHistoryEntries, numPainEntries, numTreatmentsEntries, numRiskEntries } = this.props;

    let icon = '';
    let title = '';
    if (section === 'PertinentMedicalHistory') {
      icon = <MedicalHistoryIcon width="30" height="40" />;
      title = `Pertinent Medical History (${numMedicalHistoryEntries})`;
    } else if (section === 'PainAssessments') {
      icon = <PainIcon width="35"  height="35" />;
      title = `Pain Assessments (${numPainEntries})`
    } else if (section === 'HistoricalTreatments') {
      icon = <TreatmentsIcon width="36" height="38" />;
      title = `Historical Pain-related Treatments (${numTreatmentsEntries})`
    } else if (section === 'RiskFactorsAndAssessments') {
      icon = <RiskIcon width="35" height="34" />;
      title = `Risk Factors and Assessments (${numRiskEntries})`;
    }

    return (
      <h2 id={section} className="section__header">
        <div className="section__header-title">
          {icon}

          <span>
            {title}
            <FontAwesome className={`flag flag-header ${flaggedClass}`} name="circle" />
          </span>
        </div>

        <FontAwesome className="chevron" name="chevron-right" />
      </h2>
    );
  };

  render() {
    const { summary, collector, result } = this.props;
    if (!summary) { return null; }

    return (
      <div className="summary">
        <div className="summary__nav-wrapper"><div className="summary__nav"></div></div>

        <div className="summary__display">
          <div className="summary__display-title">
            <CQLIcon width="48" height="20" />
            Factors to Consider in Managing Chronic Pain
          </div>

          <ExclusionBanner />

          {!summary.Patient.MeetsInclusionCriteria && <InclusionBanner />}

          <div className="sections">
            <Collapsible trigger={this.renderSectionHeader("PertinentMedicalHistory")} open={true}>
              {this.renderSection("PertinentMedicalHistory")}
            </Collapsible>

            <Collapsible trigger={this.renderSectionHeader("PainAssessments")} open={true}>
              {this.renderSection("PainAssessments")}
            </Collapsible>

            <Collapsible trigger={this.renderSectionHeader("HistoricalTreatments")} open={true}>
              {this.renderSection("HistoricalTreatments")}
            </Collapsible>

            <Collapsible trigger={this.renderSectionHeader("RiskFactorsAndAssessments")} open={true}>
              {this.renderSection("RiskFactorsAndAssessments")}
            </Collapsible>
          </div>

          <DevTools
            collector={collector}
            result={result}
          />

          <ReactTooltip />
        </div>
      </div>
    );
  }
}

Summary.propTypes = {
  summary: PropTypes.object.isRequired,
  sectionFlags: PropTypes.object.isRequired,
  collector: PropTypes.array.isRequired,
  result: PropTypes.object.isRequired,
  numMedicalHistoryEntries: PropTypes.number.isRequired,
  numPainEntries: PropTypes.number.isRequired,
  numTreatmentsEntries: PropTypes.number.isRequired,
  numRiskEntries: PropTypes.number.isRequired
};
