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
class CustomBlocking extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			userFilters: ''
		};

		this.updateUserFilters = this.updateUserFilters.bind(this);
	}

	/**
	 * Save updated value in state as user types in user filters textarea.
	 * @param {Object} event input box 'change' event
	 */
	updateUserFilters(event) {
		this.setState({
			userFilters: event.currentTarget.value
		});
	}

	/**
  * Render full list of categories and trackers.
  * @return {ReactComponent}   ReactComponent instance
  */
	render() {
		const { settingsData, toggleCheckbox } = this.props;
		const { userFilters } = this.state;

		return (
			<div className="s-tabs-panel s-custom-blocking-panel">
				<div className="row">
					<div className="columns">
						<h3>Override WhoTracks.Me</h3>
						<div className="s-option-group">
							<div className="s-square-checkbox">
								<input type="checkbox" id="settings-customblocking-whotracksme-overriding" name="override_whotracksme_filters" defaultChecked={settingsData.toggleCheckbox} onClick={toggleCheckbox} />
								<label htmlFor="settings-customblocking-whotracksme-overriding">Override WhoTracks.Me filters</label>
							</div>
						</div>
					</div>
				</div>
				<div className="row">
					<div className="columns">
						<h3>User Filters</h3>
						<div className="s-filters-textarea-box">
							<textarea type="text" value={userFilters} onChange={this.updateUserFilters} />
						</div>
					</div>
				</div>
			</div>
		);
	}
}

CustomBlocking.propTypes = {
	toggleCheckbox: PropTypes.func.isRequired,
};

export default CustomBlocking;
