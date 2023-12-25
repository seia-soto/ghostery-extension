/**
 * Global Blocking Settings Component
 *
 * Ghostery Browser Extension
 * https://www.ghostery.com/
 *
 * Copyright 2023 Ghostery, Inc. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0
 */

import React from 'react';
import PropTypes from 'prop-types';
/**
 * @class Implement Custom Blocking Settings subview which opens from the
 * left-side menu of the main Settings view.
 * @memberOf SettingsComponents
 */
function CustomBlocking({ settingsData, toggleCheckbox, selectItem }) {
	const [customFilters, setCustomFilters] = React.useState(settingsData.custom_filters);

	const handleCustomFiltersChange = (event) => {
		setCustomFilters(event.currentTarget.value);
	};

	const saveCustomFilters = () => {
		// reuse selectItem as there's no property difference
		selectItem({
			currentTarget: {
				name: 'custom_filters',
				value: customFilters,
			}
		});
	};

	return (
		<div className="s-tabs-panel s-custom-blocking-panel">
			<div className="row">
				<div className="columns">
					<h3>Override WhoTracks.Me</h3>
					<div className="s-option-group">
						<div className="s-square-checkbox">
							<input type="checkbox" id="settings-customblocking-whotracksme-overriding" name="toggle_override_whotracksme_filters" defaultChecked={settingsData.toggle_override_whotracksme_filters} onClick={toggleCheckbox} />
							<label htmlFor="settings-customblocking-whotracksme-overriding">Override WhoTracks.Me filters</label>
						</div>
					</div>
				</div>
			</div>
			<div className="row">
				<div className="columns">
					<h3>User Filters</h3>
					<p className="s-blue-header" onClick={saveCustomFilters}>Save</p>
					<div className="s-filters-textarea-box">
						<textarea type="text" name="custom_filters" value={customFilters} onChange={handleCustomFiltersChange} />
					</div>
				</div>
			</div>
		</div>
	);
}

CustomBlocking.propTypes = {
	toggleCheckbox: PropTypes.func.isRequired,
	selectItem: PropTypes.func.isRequired,
	settingsData: PropTypes.shape({
		custom_filters: PropTypes.string.isRequired,
		toggle_override_whotracksme_filters: PropTypes.bool.isRequired
	}).isRequired
};

export default CustomBlocking;
